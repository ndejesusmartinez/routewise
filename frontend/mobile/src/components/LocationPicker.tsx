import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapSurface } from './MapSurface';
import { AppButton, Field, Notice, colors } from './ui';
import type { Coordinates } from '../lib/types';

interface SearchResult extends Coordinates {
  placeId: number;
  label: string;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

interface LocationPickerProps {
  value: Coordinates | null;
  onChange: (value: Coordinates | null) => void;
  label: string;
}

const defaultCenter: Coordinates = { latitude: 9.7167, longitude: -75.12 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNominatimResult(value: unknown): value is NominatimResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.place_id === 'number' &&
    typeof value.lat === 'string' &&
    Number.isFinite(Number(value.lat)) &&
    Number(value.lat) >= -90 &&
    Number(value.lat) <= 90 &&
    typeof value.lon === 'string' &&
    Number.isFinite(Number(value.lon)) &&
    Number(value.lon) >= -180 &&
    Number(value.lon) <= 180 &&
    typeof value.display_name === 'string'
  );
}

export function LocationPicker({ value, onChange, label }: LocationPickerProps) {
  const lastSearchAt = useRef(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const chooseLocation = (point: Coordinates, place: string, accuracy: number | null = null) => {
    onChange(point);
    setSelectedLabel(place);
    setAccuracyMeters(accuracy);
    setResults([]);
    setMessage(null);
    Keyboard.dismiss();
  };

  const selectOnMap = (point: Coordinates) => {
    chooseLocation(point, 'Punto elegido en el mapa');
  };

  const getDeviceLocation = async () => {
    setIsLocating(true);
    setMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setMessage('No se concedió permiso de ubicación. Puedes buscar o marcar el punto en el mapa.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true
      });
      const point = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      chooseLocation(point, 'Ubicación del dispositivo', position.coords.accuracy);
    } catch (error) {
      setMessage(error instanceof Error ? `No se pudo obtener la ubicación: ${error.message}` : 'No se pudo obtener la ubicación. Puedes marcar el punto en el mapa.');
    } finally {
      setIsLocating(false);
    }
  };

  const searchAddress = async () => {
    const searchText = query.trim();
    if (!searchText) {
      setMessage('Escribe una dirección, barrio o lugar para buscar.');
      return;
    }

    setIsSearching(true);
    setMessage(null);
    setResults([]);
    try {
      const delay = Math.max(0, 1100 - (Date.now() - lastSearchAt.current));
      if (delay) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '5');
      url.searchParams.set('q', searchText);
      url.searchParams.set('accept-language', 'es');
      lastSearchAt.current = Date.now();
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`El buscador de direcciones respondió con HTTP ${response.status}.`);
      }
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) {
        throw new Error('El buscador de direcciones devolvió una respuesta inválida.');
      }
      const matches = payload.filter(isNominatimResult).map((item) => ({
        placeId: item.place_id,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        label: item.display_name
      }));
      setResults(matches);
      if (!matches.length) {
        setMessage('No encontramos resultados. Prueba con una dirección o un barrio cercano.');
      }
    } catch (error) {
      setMessage(error instanceof TypeError
        ? 'No se pudo conectar con el buscador. Comprueba tu conexión a Internet.'
        : error instanceof Error ? error.message : 'No se pudo buscar la dirección.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <View style={styles.container}>
      <Field
        autoCapitalize="sentences"
        label={label}
        onChangeText={setQuery}
        placeholder="Ej. Calle 10, Cartagena"
        value={query}
      />
      <View style={styles.searchRow}>
        <AppButton disabled={!query.trim()} loading={isSearching} onPress={() => void searchAddress()} title="Buscar dirección" variant="secondary" />
        <AppButton loading={isLocating} onPress={() => void getDeviceLocation()} title="Usar GPS" />
      </View>

      {results.length ? (
        <View style={styles.results}>
          {results.map((result) => (
            <Pressable
              accessibilityRole="button"
              key={result.placeId}
              onPress={() => chooseLocation(result, result.label)}
              style={styles.result}
            >
              <Text style={styles.pin}>⌖</Text>
              <Text style={styles.resultText}>{result.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Notice text={message} />

      <View style={styles.mapFrame}>
        <MapSurface
          center={value ?? defaultCenter}
          markers={value ? [{ coordinate: value, color: colors.green }] : []}
          onSelect={selectOnMap}
          style={StyleSheet.absoluteFill}
        />
        {!value ? <View pointerEvents="none" style={styles.mapHint}><Text style={styles.mapHintText}>Toca el mapa para marcar el punto</Text></View> : null}
      </View>

      {value ? (
        <View style={styles.selected}>
          <Text style={styles.selectedIcon}>✓</Text>
          <View style={styles.selectedBody}>
            <Text numberOfLines={2} style={styles.selectedTitle}>{selectedLabel || 'Ubicación seleccionada'}</Text>
            {accuracyMeters !== null ? (
              <Text style={[styles.selectedMeta, accuracyMeters > 100 ? styles.accuracyWarning : null]}>
                Precisión estimada: ±{Math.round(accuracyMeters)} m
                {accuracyMeters > 100 ? ' · Corrige el punto en el mapa si hace falta.' : ' · Verifica el punto en el mapa.'}
              </Text>
            ) : (
              <Text style={styles.selectedMeta}>Punto marcado en el mapa.</Text>
            )}
          </View>
          <Pressable accessibilityLabel="Quitar ubicación" accessibilityRole="button" onPress={() => { onChange(null); setSelectedLabel(''); setAccuracyMeters(null); }} style={styles.clear}>
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        </View>
      ) : null}
      <Text style={styles.privacy}>La app solicita ubicación precisa cuando la pides. Android/iOS eligen los sensores disponibles; el margen indicado puede variar. La dirección guardará las coordenadas seleccionadas.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  searchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  results: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: '#fff' },
  result: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, borderBottomWidth: 1, borderBottomColor: '#edf1ee' },
  pin: { color: colors.green, fontSize: 18 },
  resultText: { flex: 1, color: '#42564a', fontSize: 13, lineHeight: 19 },
  mapFrame: { height: 245, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  mapHint: { position: 'absolute', right: 10, bottom: 10, left: 10, alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.93)' },
  mapHintText: { color: '#45574d', fontSize: 12 },
  selected: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderWidth: 1, borderColor: '#d7eadf', borderRadius: 10, backgroundColor: '#f3faf5' },
  selectedIcon: { color: colors.green, fontSize: 17, fontWeight: '800' },
  selectedBody: { flex: 1, gap: 3 },
  selectedTitle: { color: '#315440', fontSize: 12, fontWeight: '700' },
  selectedMeta: { color: '#73857a', fontSize: 11, lineHeight: 16 },
  accuracyWarning: { color: '#a24b40' },
  clear: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  clearText: { color: colors.muted, fontSize: 22 },
  privacy: { color: '#819087', fontSize: 11, lineHeight: 16 }
});
