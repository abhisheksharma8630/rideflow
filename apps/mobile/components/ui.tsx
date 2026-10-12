import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, elevation, radii, spacing, typography } from '../theme';

export function Screen({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={[padded && { padding: spacing.lg, flex: 1 }, style]}>{children}</View>
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.charcoal },
    secondary: { bg: colors.surfaceMuted, fg: colors.charcoal, border: colors.border },
    danger: { bg: colors.danger, fg: '#fff' },
    success: { bg: colors.success, fg: '#fff' },
    ghost: { bg: 'transparent', fg: colors.charcoal },
  };
  const p = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: p.bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        p.border ? { borderWidth: 1, borderColor: p.border } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <Text style={[styles.buttonText, { color: p.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? { borderColor: colors.danger } : null]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Badge({
  text,
  tone = 'neutral',
}: {
  text: string;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceMuted, fg: colors.ink },
    success: { bg: '#E4F8EC', fg: '#128A3C' },
    danger: { bg: '#FDE7E7', fg: colors.danger },
    warning: { bg: '#FFF3D6', fg: '#9A6B00' },
    info: { bg: '#E7F0FD', fg: '#1A62C9' },
  };
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primaryDark} />
      {label ? <Text style={[typography.caption, { marginTop: spacing.sm }]}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  title,
  subtitle,
  emoji = '📭',
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
}) {
  return (
    <View style={styles.center}>
      <Text style={{ fontSize: 42, marginBottom: spacing.sm }}>{emoji}</Text>
      <Text style={typography.h3}>{title}</Text>
      {subtitle ? (
        <Text style={[typography.caption, { textAlign: 'center', marginTop: spacing.xs }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={{ fontSize: 42, marginBottom: spacing.sm }}>⚠️</Text>
      <Text style={[typography.body, { textAlign: 'center', marginBottom: spacing.md }]}>
        {message}
      </Text>
      {onRetry ? <Button title="Retry" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...elevation.card,
  },
  button: {
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  fieldLabel: { ...typography.label, marginBottom: spacing.xs },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});
