import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen } from '../../components/ui';
import { colors, radii, spacing, typography } from '../../theme';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>RF</Text>
        </View>
        <Text style={styles.brand}>RideFlow</Text>
        <Text style={styles.tagline}>Your city, one tap away</Text>
      </View>

      <View style={styles.illustration}>
        <Text style={{ fontSize: 72 }}>🛺</Text>
        <Text style={[typography.caption, { marginTop: spacing.sm, textAlign: 'center' }]}>
          Bikes, autos and cabs across Chandigarh
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Button title="Continue as Rider" onPress={() => router.push('/(auth)/login?role=CUSTOMER')} />
        <Button
          title="Continue as Captain (Driver)"
          variant="secondary"
          onPress={() => router.push('/(auth)/login?role=DRIVER')}
        />
        <Text style={styles.devNote}>
          Development demo build. A role selector is provided for demonstration only — the backend
          enforces real authorization per account.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between', paddingVertical: spacing.xxl },
  hero: { alignItems: 'center', marginTop: spacing.xl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 30, fontWeight: '900', color: colors.charcoal },
  brand: { ...typography.h1, marginTop: spacing.md },
  tagline: { ...typography.caption, marginTop: 4 },
  illustration: { alignItems: 'center' },
  devNote: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
});
