import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton, Card, Field, Notice, PageTitle, Screen, colors } from '../../components/ui';
import { createVehicle } from '../../lib/api';
import { useWorkspace } from '../../lib/WorkspaceContext';

export default function VehiclesScreen() {
  const { apiBaseUrl, vehicles, isLoading, error, refresh } = useWorkspace();
  const [vehicleId, setVehicleId] = useState('');
  const [capacity, setCapacity] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void refresh().catch(() => undefined);
  }, [refresh]));

  const submitVehicle = async () => {
    if (!vehicleId.trim() || !capacity.trim()) {
      setMessage('Completa el ID del vehículo y su capacidad.');
      return;
    }
    const parsedCapacity = Number(capacity);
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setMessage('La capacidad debe ser un número entero mayor que cero.');
      return;
    }
    setBusy(true);
    setMessage(null);
    setSuccess(null);
    try {
      await createVehicle(apiBaseUrl, { vehicle_id: vehicleId.trim(), capacity: parsedCapacity });
      setVehicleId('');
      setCapacity('');
      setSuccess('El vehículo se registró correctamente.');
      await refresh();
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : 'No se pudo registrar el vehículo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen onRefresh={() => { void refresh().catch(() => undefined); }} refreshing={isLoading}>
      <PageTitle title="Vehículos" subtitle="Gestión de flota" />
      <Notice text={error ?? message} />
      <Notice kind="success" text={success} />
      <Card>
        <Text style={styles.sectionTitle}>Registrar vehículo</Text>
        <Field autoCapitalize="characters" label="ID del vehículo" onChangeText={setVehicleId} placeholder="VEH-001" value={vehicleId} />
        <Field keyboardType="numeric" label="Capacidad" onChangeText={setCapacity} placeholder="20" value={capacity} />
        <AppButton loading={busy} onPress={() => void submitVehicle()} title="Registrar vehículo" />
      </Card>
      <View style={styles.listHeading}>
        <Text style={styles.sectionTitle}>Flota registrada</Text>
        <Text style={styles.count}>{vehicles.length}</Text>
      </View>
      {!vehicles.length && !isLoading ? <Card><Text style={styles.empty}>Todavía no hay vehículos registrados.</Text></Card> : null}
      {vehicles.map((vehicle) => (
        <Card key={vehicle.vehicle_id} style={styles.vehicleCard}>
          <View style={styles.vehicleIcon}><Text style={styles.vehicleIconText}>V</Text></View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>{vehicle.vehicle_id}</Text>
            <Text style={styles.meta}>Capacidad · {vehicle.capacity}</Text>
          </View>
          <View style={styles.available}><View style={styles.dot} /><Text style={styles.availableText}>Registrado</Text></View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  listHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  count: { minWidth: 23, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20, backgroundColor: '#eaf3ee', color: '#426456', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#e4f7ec' },
  vehicleIconText: { color: colors.green, fontSize: 17, fontWeight: '800' },
  vehicleInfo: { flex: 1, gap: 4 },
  vehicleName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 12 },
  available: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: '#34d399' },
  availableText: { color: '#458065', fontSize: 11, fontWeight: '700' },
  empty: { color: colors.muted, fontSize: 13 }
});
