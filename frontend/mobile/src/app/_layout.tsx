import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WorkspaceProvider } from '../lib/WorkspaceContext';
import { colors } from '../components/ui';

export default function RootLayout() {
  return (
    <WorkspaceProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </WorkspaceProvider>
  );
}
