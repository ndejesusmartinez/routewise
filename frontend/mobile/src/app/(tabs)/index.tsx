import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton, Card, Metric, Notice, PageTitle, Screen, StatusBadge, colors } from '../../components/ui';
import { formatDate, formatDistance, formatDuration } from '../../lib/format';
import { useWorkspace } from '../../lib/WorkspaceContext';

export default function DashboardScreen() {
  const { dashboard, plans, isLoading, error, refresh } = useWorkspace();

  useFocusEffect(useCallback(() => {
    void refresh().catch(() => undefined);
  }, [refresh]));

  return (
    <Screen onRefresh={() => { void refresh().catch(() => undefined); }} refreshing={isLoading}>
      <PageTitle
        title="RouteWise"
        subtitle="Operaciones de entrega"
        action={<Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={styles.settingsButton}><Text style={styles.settingsText}>API</Text></Pressable>}
      />
      <Notice text={error} />
      <View style={styles.metrics}>
        <Metric label="Pedidos" value={dashboard?.total_orders ?? '—'} hint={`${dashboard?.orders_by_status.PENDING ?? 0} pendientes`} />
        <Metric label="Vehículos" value={dashboard?.total_vehicles ?? '—'} hint="Registrados" />
        <Metric label="Planes" value={dashboard?.total_plans ?? '—'} hint="Guardados" />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Estado de pedidos</Text>
        <View style={styles.statusGrid}>
          {(['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const).map((status) => (
            <View key={status} style={styles.statusCell}>
              <StatusBadge status={status} />
              <Text style={styles.statusCount}>{dashboard?.orders_by_status[status] ?? 0}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.cardHeading}>
          <Text style={styles.sectionTitle}>Planes recientes</Text>
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/plans')}><Text style={styles.link}>Ver todos</Text></Pressable>
        </View>
        {plans.slice(0, 5).map((plan) => (
          <Pressable key={plan.plan_id} onPress={() => router.navigate({ pathname: '/plans', params: { planId: String(plan.plan_id) } })} style={styles.planRow}>
            <View style={styles.planMain}>
              <Text style={styles.planName}>Plan #{plan.plan_id}</Text>
              <Text style={styles.planMeta}>{formatDate(plan.created_at)}</Text>
            </View>
            <View style={styles.planStats}>
              <Text style={styles.planName}>{formatDistance(plan.total_distance_meters)}</Text>
              <Text style={styles.planMeta}>{formatDuration(plan.total_duration_seconds)}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
        {!plans.length && !isLoading ? <Text style={styles.empty}>Todavía no hay planes. Selecciona pedidos y vehículos en la pestaña Planes.</Text> : null}
        {isLoading && !dashboard ? <Text style={styles.empty}>Cargando datos…</Text> : null}
      </Card>

      <Card style={styles.shortcuts}>
        <Text style={styles.sectionTitle}>Accesos rápidos</Text>
        <AppButton title="Registrar pedido" onPress={() => router.navigate('/orders')} />
        <AppButton title="Crear un plan" onPress={() => router.navigate('/plans')} variant="secondary" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  settingsButton: { minWidth: 46, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: '#fff' },
  settingsText: { color: colors.green, fontWeight: '800' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusCell: { minWidth: '30%', flexGrow: 1, gap: 8, padding: 10, borderWidth: 1, borderColor: '#edf1ee', borderRadius: 10, backgroundColor: '#fbfcfb' },
  statusCount: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.green, fontSize: 13, fontWeight: '700' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#edf1ee' },
  planMain: { flex: 1 },
  planStats: { alignItems: 'flex-end' },
  planName: { color: '#31443a', fontSize: 13, fontWeight: '700' },
  planMeta: { marginTop: 3, color: colors.muted, fontSize: 11 },
  chevron: { color: colors.muted, fontSize: 24 },
  empty: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  shortcuts: { gap: 9 }
});
