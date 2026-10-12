import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Field, Screen } from '../../components/ui';
import { colors, radii, spacing, typography } from '../../theme';
import { useAuth } from '../../store/auth';
import type { UserRole } from '../../types';

const DEMO_ACCOUNTS: Record<'CUSTOMER' | 'DRIVER', { phone: string; label: string }[]> = {
  CUSTOMER: [{ phone: '9810000001', label: 'Aarav Sharma (rider)' }],
  DRIVER: [
    { phone: '9820000001', label: 'Vikram Singh · Bike' },
    { phone: '9820000002', label: 'Manpreet Kaur · Auto' },
    { phone: '9820000003', label: 'Suresh Kumar · Cab' },
    { phone: '9820000004', label: 'Deepak Rana · Pending approval' },
  ],
};

export default function Login() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role as UserRole) ?? 'CUSTOMER';
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const loading = useAuth((s) => s.loading);
  const [phone, setPhone] = useState(role === 'DRIVER' ? '9820000001' : '9810000001');
  const [error, setError] = useState<string | undefined>();

  const isValid = /^(\+91)?[6-9]\d{9}$/.test(phone.trim());

  async function submit() {
    setError(undefined);
    if (!isValid) {
      setError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    try {
      const user = await login(phone.trim(), role);
      router.replace(user.role === 'DRIVER' ? '/(driver)/home' : '/(customer)/home');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      setError(msg);
      Alert.alert('Could not sign in', msg);
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: spacing.md }}>
          <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>‹ Back</Text>
        </Pressable>

        <Text style={typography.h1}>
          {role === 'DRIVER' ? 'Captain sign in' : 'Rider sign in'}
        </Text>
        <View style={styles.demoTag}>
          <Text style={styles.demoTagText}>DEMO AUTH · development only</Text>
        </View>
        <Text style={[typography.caption, { marginBottom: spacing.lg }]}>
          This is a simulated login for the prototype. No real OTP or phone verification is
          performed. Pick a seeded demo account below or type its number.
        </Text>

        <Card>
          <Field
            label="Mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="98XXXXXXXX"
            maxLength={13}
            error={error}
          />
          <Button title="Continue" onPress={submit} loading={loading} disabled={!isValid} />
        </Card>

        <Text style={[typography.label, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
          SEEDED DEMO {role === 'DRIVER' ? 'CAPTAINS' : 'RIDERS'}
        </Text>
        {DEMO_ACCOUNTS[role === 'DRIVER' ? 'DRIVER' : 'CUSTOMER'].map((a) => (
          <Pressable key={a.phone} onPress={() => setPhone(a.phone)}>
            <Card style={styles.accountRow}>
              <View>
                <Text style={typography.bodyStrong}>{a.label}</Text>
                <Text style={typography.caption}>{a.phone}</Text>
              </View>
              <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>Use</Text>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  demoTag: {
    backgroundColor: '#FFF3D6',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    marginVertical: spacing.sm,
  },
  demoTagText: { fontSize: 11, fontWeight: '800', color: '#9A6B00' },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
});
