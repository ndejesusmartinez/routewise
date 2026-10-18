import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AppButton, Card, Field, Notice, PageTitle, Screen, colors } from '../components/ui';
import { fetchDashboardSummary } from '../lib/api';
import { useWorkspace } from '../lib/WorkspaceContext';

export default function SettingsScreen() {
  const { apiBaseUrl, setApiBaseUrl } = useWorkspace();
  const [value, setValue] = useState(apiBaseUrl);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    setSaved(null);
    try {
      await setApiBaseUrl(value);
      await fetchDashboardSummary(value.trim().replace(/\/+$/, ''));
      setSaved('Conexión guardada y API consultada.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la dirección de la API.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <PageTitle
        title="Conexión"
        subtitle="Configuración"
        action={<Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.close}><Text style={styles.closeText}>Cerrar</Text></Pressable>}
      />
      <Notice text={error} />
      <Notice kind="success" text={saved} />
      <Card>
        <Text style={styles.title}>URL del backend</Text>
        <Text style={styles.body}>En Android Emulator usa http://10.0.2.2:8000. En un teléfono físico usa la IP local de tu PC, por ejemplo http://192.168.1.20:8000, y conecta ambos a la misma red Wi-Fi.</Text>
        <Field autoCapitalize="none" keyboardType="url" label="Dirección de la API" onChangeText={setValue} placeholder="http://192.168.1.20:8000" value={value} />
        <AppButton loading={isSaving} onPress={() => void save()} title="Guardar y probar conexión" />
      </Card>
      <Notice kind="info" text="En producción configura una API HTTPS pública. La conexión HTTP está habilitada en esta app únicamente para facilitar pruebas locales." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  closeText: { color: colors.green, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  body: { color: '#68776f', fontSize: 13, lineHeight: 19 }
});
