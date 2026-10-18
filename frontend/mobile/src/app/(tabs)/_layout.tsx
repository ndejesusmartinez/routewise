import { Tabs } from 'expo-router';
import { colors } from '../../components/ui';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: '#819087',
        tabBarStyle: {
          height: 62,
          paddingTop: 6,
          paddingBottom: 7,
          borderTopColor: colors.border,
          backgroundColor: '#fff'
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Resumen', tabBarLabel: 'Resumen' }} />
      <Tabs.Screen name="orders" options={{ title: 'Pedidos', tabBarLabel: 'Pedidos' }} />
      <Tabs.Screen name="vehicles" options={{ title: 'Vehículos', tabBarLabel: 'Vehículos' }} />
      <Tabs.Screen name="plans" options={{ title: 'Planes', tabBarLabel: 'Planes' }} />
    </Tabs>
  );
}
