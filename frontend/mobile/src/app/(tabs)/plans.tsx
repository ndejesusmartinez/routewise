import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton, Card, Notice, PageTitle, Screen, colors } from '../../components/ui';
import { LocationPicker } from '../../components/LocationPicker';
import { MapSurface } from '../../components/MapSurface';
import { createRegisteredPlan, fetchRoutePlan } from '../../lib/api';
import { formatDate, formatDistance, formatDuration } from '../../lib/format';
import { useWorkspace } from '../../lib/WorkspaceContext';
import type { Coordinates, PlanSummary, RoutePlan } from '../../lib/types';

const lineColors = ['#16734f', '#2563eb', '#f59e0b', '#ef4444', '#7c3aed'];

export default function PlansScreen() {
  const { planId: requestedPlanId } = useLocalSearchParams<{ planId?: string }>();
  const { apiBaseUrl, orders, vehicles, plans, isLoading, error, refresh } = useWorkspace();
  const requestedPlanNumber = requestedPlanId && Number.isInteger(Number(requestedPlanId))
    ? Number(requestedPlanId)
    : null;
  const [pickedPlanId, setPickedPlanId] = useState<number | null>(null);
  const selectedPlanId = pickedPlanId ?? requestedPlanNumber ?? plans[0]?.plan_id ?? null;
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [loadedPlanId, setLoadedPlanId] = useState<number | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [depot, setDepot] = useState<Coordinates | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void refresh().catch(() => undefined);
  }, [refresh]));

  useEffect(() => {
    if (selectedPlanId === null) {
      return;
    }
    let active = true;
    fetchRoutePlan(apiBaseUrl, selectedPlanId)
      .then((nextPlan) => {
        if (active) {
          setPlan(nextPlan);
          setLoadedPlanId(selectedPlanId);
          setSelectedRouteId(nextPlan.routes[0]?.vehicle_id ?? null);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setMessage(loadError instanceof Error ? loadError.message : 'No se pudo cargar el plan.');
          setPlan(null);
        }
      });
    return () => {
      active = false;
    };
  }, [apiBaseUrl, selectedPlanId]);

  const pendingOrders = useMemo(() => orders.filter((order) => order.status === 'PENDING'), [orders]);
  const selectedOrderRecords = pendingOrders.filter((order) => selectedOrders.includes(order.order_id));
  const selectedVehicleRecords = vehicles.filter((vehicle) => selectedVehicles.includes(vehicle.vehicle_id));
  const totalDemand = selectedOrderRecords.reduce((total, order) => total + order.demand, 0);
  const totalCapacity = selectedVehicleRecords.reduce((total, vehicle) => total + vehicle.capacity, 0);
  const maximumCapacity = Math.max(0, ...selectedVehicleRecords.map((vehicle) => vehicle.capacity));
  const capacityInsufficient = totalDemand > totalCapacity || selectedOrderRecords.some((order) => order.demand > maximumCapacity);
  const activePlan = loadedPlanId === selectedPlanId ? plan : null;
  const activeRoute = activePlan?.routes.find((route) => route.vehicle_id === selectedRouteId) ?? activePlan?.routes[0] ?? null;

  const toggleId = (selected: string[], setSelected: (value: string[]) => void, id: string) => {
    setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const createPlan = async () => {
    if (!selectedOrderRecords.length || !selectedVehicleRecords.length || !depot) {
      setMessage('Selecciona pedidos pendientes, vehículos y un punto de depósito en el mapa.');
      return;
    }
    if (capacityInsufficient) {
      setMessage('La capacidad total seleccionada no alcanza para todos los pedidos.');
      return;
    }

    setBusy(true);
    setMessage(null);
    setSuccess(null);
    try {
      const created = await createRegisteredPlan(apiBaseUrl, {
        depot: { location_id: 'DEPOT-001', ...depot },
        order_ids: selectedOrderRecords.map((order) => order.order_id),
        vehicle_ids: selectedVehicleRecords.map((vehicle) => vehicle.vehicle_id)
      });
      setPlan(created);
      setLoadedPlanId(created.plan_id);
      setPickedPlanId(created.plan_id);
      setSelectedRouteId(created.routes[0]?.vehicle_id ?? null);
      setSelectedOrders([]);
      setSelectedVehicles([]);
      setSuccess(`Plan #${created.plan_id} creado y guardado.`);
      await refresh();
    } catch (createError) {
      setMessage(createError instanceof Error ? createError.message : 'No se pudo crear el plan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen onRefresh={() => { void refresh().catch(() => undefined); }} refreshing={isLoading}>
      <PageTitle title="Planes" subtitle="Optimización de rutas" />
      <Notice text={error ?? message} />
      <Notice kind="success" text={success} />

      <Card>
        <Text style={styles.sectionTitle}>Crear plan de entrega</Text>
        <Text style={styles.helper}>Elige pedidos pendientes, vehículos y el punto de salida.</Text>

        <View style={styles.selectorSection}>
          <Text style={styles.label}>Pedidos pendientes ({pendingOrders.length})</Text>
          {pendingOrders.length ? pendingOrders.map((order) => {
            const checked = selectedOrders.includes(order.order_id);
            return (
              <Pressable key={order.order_id} onPress={() => toggleId(selectedOrders, setSelectedOrders, order.order_id)} style={styles.choiceRow}>
                <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]}>{checked ? <Text style={styles.checkMark}>✓</Text> : null}</View>
                <View style={styles.choiceBody}>
                  <Text style={styles.choiceTitle}>{order.order_id}</Text>
                  <Text style={styles.choiceMeta}>Carga {order.demand} · {order.latitude.toFixed(3)}, {order.longitude.toFixed(3)}</Text>
                </View>
              </Pressable>
            );
          }) : <Text style={styles.empty}>No hay pedidos pendientes. Registra uno en la pestaña Pedidos.</Text>}
        </View>

        <View style={styles.selectorSection}>
          <Text style={styles.label}>Vehículos ({vehicles.length})</Text>
          {vehicles.length ? vehicles.map((vehicle) => {
            const checked = selectedVehicles.includes(vehicle.vehicle_id);
            return (
              <Pressable key={vehicle.vehicle_id} onPress={() => toggleId(selectedVehicles, setSelectedVehicles, vehicle.vehicle_id)} style={styles.choiceRow}>
                <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]}>{checked ? <Text style={styles.checkMark}>✓</Text> : null}</View>
                <View style={styles.choiceBody}>
                  <Text style={styles.choiceTitle}>{vehicle.vehicle_id}</Text>
                  <Text style={styles.choiceMeta}>Capacidad {vehicle.capacity}</Text>
                </View>
              </Pressable>
            );
          }) : <Text style={styles.empty}>Registra vehículos en la pestaña Vehículos.</Text>}
        </View>

        <View style={styles.selectorSection}>
          <Text style={styles.label}>Punto de salida / depósito</Text>
          <LocationPicker label="Busca o marca el depósito" onChange={setDepot} value={depot} />
        </View>

        <View style={styles.capacityBox}>
          <Text style={[styles.capacityText, capacityInsufficient ? styles.capacityWarning : null]}>
            Selección: {selectedOrderRecords.length} pedidos · carga {totalDemand} / capacidad {totalCapacity}
            {capacityInsufficient ? ' · Capacidad insuficiente' : ''}
          </Text>
        </View>
        <AppButton
          disabled={busy || !selectedOrders.length || !selectedVehicles.length || !depot || capacityInsufficient}
          loading={busy}
          onPress={() => void createPlan()}
          title="Optimizar y crear plan"
        />
      </Card>

      <Card>
        <View style={styles.headingRow}>
          <Text style={styles.sectionTitle}>Planes guardados</Text>
          <Text style={styles.count}>{plans.length}</Text>
        </View>
        {!plans.length && !isLoading ? <Text style={styles.empty}>Los planes creados aparecerán aquí.</Text> : null}
        {plans.map((item) => (
          <PlanRow
            item={item}
            key={item.plan_id}
            onPress={() => { setPickedPlanId(item.plan_id); setMessage(null); }}
            selected={selectedPlanId === item.plan_id}
          />
        ))}
      </Card>

      {activePlan ? (
        <>
          <Card>
            <Text style={styles.sectionTitle}>Plan #{activePlan.plan_id}</Text>
            <Text style={styles.helper}>{formatDate(activePlan.created_at)} · {activePlan.provider}</Text>
            <View style={styles.summaryRow}>
              <SummaryItem label="Distancia" value={formatDistance(activePlan.total_distance_meters)} />
              <SummaryItem label="Duración" value={formatDuration(activePlan.total_duration_seconds)} />
              <SummaryItem label="Vehículos" value={activePlan.routes.length} />
            </View>
            <View style={styles.routeTabs}>
              {activePlan.routes.map((route) => (
                <Pressable
                  key={route.vehicle_id}
                  onPress={() => setSelectedRouteId(route.vehicle_id)}
                  style={[styles.routeTab, route.vehicle_id === activeRoute?.vehicle_id ? styles.routeTabActive : null]}
                >
                  <Text style={[styles.routeTabText, route.vehicle_id === activeRoute?.vehicle_id ? styles.routeTabTextActive : null]}>
                    {route.vehicle_id}
                  </Text>
                  <Text style={styles.routeTabMeta}>{route.order_ids.length} pedidos</Text>
                </Pressable>
              ))}
            </View>
            {activeRoute ? (
              <View style={styles.routeStats}>
                <SummaryItem label="Carga" value={`${activeRoute.load} / ${activeRoute.capacity}`} />
                <SummaryItem label="Distancia" value={formatDistance(activeRoute.distance_meters)} />
                <SummaryItem label="Duración" value={formatDuration(activeRoute.duration_seconds)} />
              </View>
            ) : null}
          </Card>

          <Card style={styles.mapCard}>
            <Text style={styles.sectionTitle}>Mapa del recorrido</Text>
            <PlanMap plan={activePlan} selectedVehicleId={activeRoute?.vehicle_id ?? null} />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Pedidos en orden de visita</Text>
            {activeRoute?.order_ids.length ? activeRoute.order_ids.map((orderId, index) => (
              <View key={`${orderId}-${index}`} style={styles.stopRow}>
                <Text style={styles.stopNumber}>{index + 1}</Text>
                <Text style={styles.choiceTitle}>{orderId}</Text>
              </View>
            )) : <Text style={styles.empty}>No hay pedidos asociados a esta ruta.</Text>}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function PlanRow({ item, selected, onPress }: { item: PlanSummary; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.savedPlan, selected ? styles.savedPlanSelected : null]}>
      <View style={styles.choiceBody}>
        <Text style={styles.choiceTitle}>Plan #{item.plan_id}</Text>
        <Text style={styles.choiceMeta}>{formatDate(item.created_at)} · {item.provider}</Text>
      </View>
      <Text style={styles.planDistance}>{formatDistance(item.total_distance_meters)}</Text>
    </Pressable>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.summaryItem}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

function PlanMap({ plan, selectedVehicleId }: { plan: RoutePlan; selectedVehicleId: string | null }) {
  const selectedRoute = plan.routes.find((route) => route.vehicle_id === selectedVehicleId);
  const coordinates = selectedRoute?.geometry?.coordinates
    .filter((coordinate) => coordinate.length === 2 && coordinate.every(Number.isFinite))
    .map(([longitude, latitude]) => ({ latitude, longitude })) ?? [];
  const center = coordinates[0] ?? { latitude: 9.7167, longitude: -75.12 };

  if (coordinates.length < 2) {
    return <View style={styles.mapEmpty}><Text style={styles.empty}>La geometría de esta ruta no está disponible.</Text></View>;
  }

  return (
    <View style={styles.routeMapContainer}>
      <MapSurface
        center={center}
        markers={[
          { coordinate: coordinates[0], color: colors.green },
          { coordinate: coordinates[coordinates.length - 1], color: '#a6423a' }
        ]}
        routes={plan.routes.flatMap((route, index) => {
          const path = route.geometry?.coordinates
            .filter((coordinate) => coordinate.length === 2 && coordinate.every(Number.isFinite))
            .map(([longitude, latitude]) => ({ latitude, longitude })) ?? [];
          if (path.length < 2) {
            return [];
          }
          const active = route.vehicle_id === selectedVehicleId;
          return [{
            coordinates: path,
            color: active ? colors.green : lineColors[index % lineColors.length],
            width: active ? 6 : 3
          }];
        })}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  selectorSection: { gap: 7, paddingTop: 3 },
  label: { color: '#45574d', fontSize: 13, fontWeight: '700' },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, borderRadius: 10, backgroundColor: '#fbfcfb' },
  checkbox: { width: 21, height: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#c5d1c9', borderRadius: 6, backgroundColor: '#fff' },
  checkboxChecked: { borderColor: colors.green, backgroundColor: colors.green },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '900' },
  choiceBody: { flex: 1, gap: 3 },
  choiceTitle: { color: '#31443a', fontSize: 13, fontWeight: '700' },
  choiceMeta: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  empty: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  capacityBox: { padding: 10, borderRadius: 9, backgroundColor: '#f2f7f4' },
  capacityText: { color: '#607167', fontSize: 12, lineHeight: 17 },
  capacityWarning: { color: '#a24b40', fontWeight: '700' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { minWidth: 23, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20, backgroundColor: '#eaf3ee', color: '#426456', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  savedPlan: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: '#edf1ee' },
  savedPlanSelected: { borderRadius: 9, backgroundColor: '#eff8f2' },
  planDistance: { color: colors.green, fontSize: 12, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryItem: { flex: 1, gap: 4 },
  summaryLabel: { color: colors.muted, fontSize: 11 },
  summaryValue: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  routeTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 3 },
  routeTab: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 9 },
  routeTabActive: { borderColor: colors.green, backgroundColor: '#eff8f2' },
  routeTabText: { color: '#4c5d54', fontSize: 12, fontWeight: '700' },
  routeTabTextActive: { color: colors.green },
  routeTabMeta: { marginTop: 2, color: colors.muted, fontSize: 10 },
  routeStats: { flexDirection: 'row', gap: 8, paddingTop: 7, borderTopWidth: 1, borderTopColor: '#edf1ee' },
  mapCard: { overflow: 'hidden' },
  routeMapContainer: { width: '100%', height: 270, overflow: 'hidden', borderRadius: 10 },
  mapEmpty: { height: 150, alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 10, backgroundColor: '#f5f8f6' },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#edf1ee' },
  stopNumber: { width: 25, height: 25, overflow: 'hidden', borderRadius: 14, backgroundColor: '#dff1e5', color: colors.green, fontSize: 12, fontWeight: '800', lineHeight: 25, textAlign: 'center' }
});
