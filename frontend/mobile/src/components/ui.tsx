import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { OrderStatus } from '../lib/types';
import { statusLabels } from '../lib/format';

export const colors = {
  background: '#f4f7f5',
  surface: '#ffffff',
  ink: '#17211e',
  muted: '#77867f',
  border: '#e2e9e5',
  green: '#16734f',
  greenLight: '#e4f7ec',
  red: '#a6423a',
  redLight: '#fff2f0',
  amber: '#8c5b0a',
  amberLight: '#fff5dc'
};

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const content = scroll
    ? <ScrollView
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl onRefresh={onRefresh} refreshing={refreshing} /> : undefined}
      >{children}</ScrollView>
    : <View style={styles.screenContent}>{children}</View>;
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>{content}</SafeAreaView>;
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.pageTitle}>
      <View style={styles.pageTitleText}>
        {subtitle ? <Text style={styles.eyebrow}>{subtitle}</Text> : null}
        <Text style={styles.pageHeading}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet';
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && !disabled && !loading ? styles.buttonPressed : null,
        disabled || loading ? styles.buttonDisabled : null
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.green} /> : <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'none',
  multiline = false
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#a3b0a9"
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        value={value}
      />
    </View>
  );
}

export function Notice({ text, kind = 'error' }: { text: string | null; kind?: 'error' | 'success' | 'info' }) {
  if (!text) {
    return null;
  }
  return <View style={[styles.notice, styles[`notice_${kind}`]]}><Text style={[styles.noticeText, styles[`noticeText_${kind}`]]}>{text}</Text></View>;
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <View style={[styles.badge, styles[`badge_${status}`]]}><Text style={[styles.badgeText, styles[`badgeText_${status}`]]}>{statusLabels[status]}</Text></View>;
}

export function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: 18, paddingBottom: 36, gap: 14 },
  pageTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 2 },
  pageTitleText: { flex: 1, gap: 3 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  pageHeading: { color: colors.ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.6 },
  card: { padding: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, gap: 11 },
  button: { minHeight: 42, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  button_primary: { backgroundColor: colors.green },
  button_secondary: { borderWidth: 1, borderColor: '#d8e1dc', backgroundColor: '#fff' },
  button_danger: { backgroundColor: colors.redLight },
  button_quiet: { backgroundColor: 'transparent' },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  buttonText_primary: { color: '#fff' },
  buttonText_secondary: { color: '#34433c' },
  buttonText_danger: { color: colors.red },
  buttonText_quiet: { color: colors.green },
  field: { gap: 6 },
  fieldLabel: { color: '#45574d', fontSize: 13, fontWeight: '600' },
  input: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#dbe4de', borderRadius: 10, backgroundColor: '#fff', color: colors.ink, fontSize: 15 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  notice: { padding: 11, borderWidth: 1, borderRadius: 10 },
  notice_error: { borderColor: '#f0c8c5', backgroundColor: colors.redLight },
  notice_success: { borderColor: '#c7e6d4', backgroundColor: '#effaf3' },
  notice_info: { borderColor: '#d5e5ef', backgroundColor: '#f0f8fc' },
  noticeText: { fontSize: 13, lineHeight: 19 },
  noticeText_error: { color: '#8e3932' },
  noticeText_success: { color: '#276643' },
  noticeText_info: { color: '#355e73' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  badge_PENDING: { backgroundColor: '#fff5dc' },
  badge_ASSIGNED: { backgroundColor: '#e7f1ff' },
  badge_IN_TRANSIT: { backgroundColor: '#e7edff' },
  badge_DELIVERED: { backgroundColor: '#e4f7ec' },
  badge_CANCELLED: { backgroundColor: '#fcebec' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeText_PENDING: { color: '#8c5b0a' },
  badgeText_ASSIGNED: { color: '#315d98' },
  badgeText_IN_TRANSIT: { color: '#4c50a1' },
  badgeText_DELIVERED: { color: '#247149' },
  badgeText_CANCELLED: { color: '#a64a50' },
  metric: { flex: 1, minWidth: '30%', gap: 4, padding: 13 },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  metricValue: { color: colors.ink, fontSize: 25, fontWeight: '800' },
  metricHint: { color: colors.muted, fontSize: 11 }
});
