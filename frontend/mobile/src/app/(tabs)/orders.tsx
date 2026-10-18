import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton, Card, Field, Notice, PageTitle, Screen, StatusBadge, colors } from '../../components/ui';
import { LocationPicker } from '../../components/LocationPicker';
import { createOrder, updateOrderStatus } from '../../lib/api';
import { useWorkspace } from '../../lib/WorkspaceContext';
import type { Coordinates, Order, OrderStatus } from '../../lib/types';

export default function OrdersScreen() {
  const { apiBaseUrl, orders, isLoading, error, refresh } = useWorkspace();
  const [orderId, setOrderId] = useState('');
  const [demand, setDemand] = useState('');
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void refresh().catch(() => undefined);
  }, [refresh]));

  const submitOrder = async () => {
    if (!orderId.trim() || !demand.trim() || !location) {
      setMessage('Completa el ID, la demanda y marca el punto de entrega en el mapa.');
      return;
    }
    const parsedDemand = Number(demand);
    if (!Number.isInteger(parsedDemand) || parsedDemand < 1) {
      setMessage('La demanda debe ser un número entero mayor que cero.');
      return;
    }

    setBusy(true);
    setMessage(null);
    setSuccess(null);
    try {
      await createOrder(apiBaseUrl, {
        order_id: orderId.trim(),
        demand: parsedDemand,
        latitude: location.latitude,
        longitude: location.longitude
      });
      setOrderId('');
      setDemand('');
      setLocation(null);
      setSuccess('El pedido se registró correctamente.');
      await refresh();
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : 'No se pudo registrar el pedido.');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (order: Order, nextStatus: OrderStatus) => {
    setBusyOrderId(order.order_id);
    setMessage(null);
    setSuccess(null);
    try {
      await updateOrderStatus(apiBaseUrl, order.order_id, nextStatus);
      setSuccess(`Pedido ${order.order_id}: ${nextStatus === 'IN_TRANSIT' ? 'entrega iniciada' : nextStatus === 'DELIVERED' ? 'marcado como entregado' : 'cancelado'}.`);
      await refresh();
    } catch (statusError) {
      setMessage(statusError instanceof Error ? statusError.message : 'No se pudo actualizar el estado.');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <Screen onRefresh={() => { void refresh().catch(() => undefined); }} refreshing={isLoading}>
      <PageTitle title="Pedidos" subtitle="Registro y seguimiento" />
      <Notice text={error ?? message} />
      <Notice kind="success" text={success} />

      <Card>
        <Text style={styles.sectionTitle}>Registrar pedido</Text>
        <Field autoCapitalize="characters" label="ID del pedido" onChangeText={setOrderId} placeholder="PED-001" value={orderId} />
        <Field keyboardType="numeric" label="Demanda / carga" onChangeText={setDemand} placeholder="5" value={demand} />
        <LocationPicker label="Punto de entrega" onChange={setLocation} value={location} />
        <AppButton disabled={!orderId.trim() || !demand.trim() || !location} loading={busy} onPress={() => void submitOrder()} title="Registrar pedido" />
      </Card>

      <View style={styles.listHeading}>
        <Text style={styles.sectionTitle}>Pedidos registrados</Text>
        <Text style={styles.count}>{orders.length}</Text>
      </View>
      {!orders.length && !isLoading ? <Card><Text style={styles.empty}>Todavía no hay pedidos registrados.</Text></Card> : null}
      {orders.map((order) => (
        <Card key={order.order_id} style={styles.orderCard}>
          <View style={styles.cardTop}>
            <View style={styles.orderMain}>
              <Text style={styles.orderId}>{order.order_id}</Text>
              <Text style={styles.meta}>Carga {order.demand}</Text>
            </View>
            <StatusBadge status={order.status} />
          </View>
          <Text style={styles.meta}>Ubicación · {order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}</Text>
          {order.status === 'ASSIGNED' ? <AppButton disabled={busyOrderId !== null} loading={busyOrderId === order.order_id} onPress={() => void changeStatus(order, 'IN_TRANSIT')} title="Iniciar entrega" /> : null}
          {order.status === 'IN_TRANSIT' ? <AppButton disabled={busyOrderId !== null} loading={busyOrderId === order.order_id} onPress={() => void changeStatus(order, 'DELIVERED')} title="Marcar entregado" /> : null}
          {order.status === 'PENDING' ? <AppButton disabled={busyOrderId !== null} loading={busyOrderId === order.order_id} onPress={() => void changeStatus(order, 'CANCELLED')} title="Cancelar pedido" variant="danger" /> : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  listHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  count: { minWidth: 23, paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden', borderRadius: 20, backgroundColor: '#eaf3ee', color: '#426456', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  orderCard: { gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  orderMain: { flex: 1, gap: 4 },
  orderId: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 12 },
  empty: { color: colors.muted, fontSize: 13 }
});
