import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface AddressResult {
  placeId: number;
  latitude: number;
  longitude: number;
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
  onChange: (coordinates: Coordinates | null) => void;
}

const defaultCenter: Coordinates = { latitude: 10.391, longitude: -75.479 };
const geocoderUrl = 'https://nominatim.openstreetmap.org/search';

function MapClickHandler({ onChange }: { onChange: (coordinates: Coordinates) => void }) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng
      });
    }
  });

  return null;
}

function MapCenterController({ center }: { center: Coordinates }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([center.latitude, center.longitude], Math.max(map.getZoom(), 14));
  }, [center.latitude, center.longitude, map]);

  return null;
}

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

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lastSearchAt = useRef(0);
  const center = value ?? defaultCenter;

  const handleSelect = (coordinates: Coordinates, label: string) => {
    onChange(coordinates);
    setSelectedLabel(label);
    setAccuracyMeters(null);
    setResults([]);
    setMessage(null);
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
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const url = new URL(geocoderUrl);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '5');
      url.searchParams.set('q', searchText);
      lastSearchAt.current = Date.now();
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`El servicio de direcciones respondió con HTTP ${response.status}.`);
      }

      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) {
        throw new Error('El servicio de direcciones devolvió una respuesta inválida.');
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
      setMessage(
        error instanceof TypeError
          ? 'No se pudo conectar con el buscador de direcciones. Comprueba tu conexión e inténtalo de nuevo.'
          : error instanceof Error
            ? error.message
            : 'No se pudo buscar la dirección.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void searchAddress();
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Este navegador no permite obtener la ubicación. Puedes buscar una dirección o marcarla en el mapa.');
      return;
    }

    setIsLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleSelect(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          },
          'Ubicación del dispositivo'
        );
        setAccuracyMeters(position.coords.accuracy);
        setIsLocating(false);
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'No se concedió permiso para acceder a la ubicación. Puedes buscar una dirección o marcarla en el mapa.',
          2: 'No se pudo determinar tu ubicación. Puedes buscar una dirección o marcarla en el mapa.',
          3: 'La solicitud de ubicación tardó demasiado. Inténtalo de nuevo o marca el punto en el mapa.'
        };
        setMessage(messages[error.code] ?? 'No se pudo obtener la ubicación. Puedes marcarla en el mapa.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  return (
    <div className="location-picker">
      <div className="location-search">
        <label htmlFor="order-address">Dirección del pedido</label>
        <div className="location-search-row">
          <input
            autoComplete="street-address"
            id="order-address"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Ej. Calle 10, Cartagena"
            value={query}
          />
          <button
            className="button button-secondary"
            disabled={isSearching || !query.trim()}
            onClick={() => void searchAddress()}
            type="button"
          >
            {isSearching ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        <button
          className="location-action"
          disabled={isLocating}
          onClick={useCurrentLocation}
          type="button"
        >
          {isLocating ? 'Obteniendo ubicación…' : '◎ Usar GPS / ubicación del dispositivo'}
        </button>
      </div>

      {results.length ? (
        <div aria-label="Resultados de direcciones" className="address-results" role="list">
          {results.map((result) => (
            <button
              className="address-result"
              key={result.placeId}
              onClick={() => handleSelect(result, result.label)}
              role="listitem"
              type="button"
            >
              <span className="result-pin">⌖</span>
              <span>{result.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {message ? <p className="location-message" role="status">{message}</p> : null}

      <div className="location-map-wrap">
        <MapContainer
          center={[center.latitude, center.longitude]}
          className="location-map"
          scrollWheelZoom
          zoom={13}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapCenterController center={center} />
          <MapClickHandler onChange={(coordinates) => handleSelect(coordinates, 'Punto elegido en el mapa')} />
          {value ? (
            <CircleMarker
              center={[value.latitude, value.longitude]}
              pathOptions={{ color: '#fff', fillColor: '#16734f', fillOpacity: 1, weight: 3 }}
              radius={10}
            />
          ) : null}
        </MapContainer>
        {!value ? (
          <div className="map-hint">Busca una dirección o toca el mapa para marcar el punto de entrega.</div>
        ) : null}
      </div>

      {value ? (
        <div className="selected-location" role="status">
          <span className="selected-location-mark">✓</span>
          <span>
            <strong>{selectedLabel || 'Ubicación seleccionada'}</strong>
            {accuracyMeters !== null ? (
              <small className={accuracyMeters > 100 ? 'location-accuracy location-accuracy-warning' : 'location-accuracy'}>
                Precisión estimada: ±{Math.round(accuracyMeters)} m
                {accuracyMeters > 100 ? ' · Puede ser aproximada; corrige el punto en el mapa si hace falta.' : ' · Verifica el punto en el mapa.'}
              </small>
            ) : (
              <small>El punto de entrega está marcado en el mapa.</small>
            )}
          </span>
          <button
            aria-label="Quitar ubicación seleccionada"
            className="clear-location"
            onClick={() => {
              onChange(null);
              setSelectedLabel('');
              setAccuracyMeters(null);
            }}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}
      <p className="location-privacy">
        La web solicita alta precisión al dispositivo. El navegador y el sistema operativo eligen los sensores disponibles; el margen mostrado ayuda a detectar resultados aproximados, pero no identifica si se usó GPS, Wi-Fi o red móvil. Tu ubicación solo se consulta cuando pulsas el botón.
      </p>
    </div>
  );
}
