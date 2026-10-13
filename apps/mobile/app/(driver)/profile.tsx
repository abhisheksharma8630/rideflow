import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Loading, Screen, useScrollBottomPadding } from '../../components/ui';
import { colors, radii, spacing, typography, VEHICLE_META } from '../../theme';
import { useAuth } from '../../store/auth';
import { api, getApiBaseUrl } from '../../services/api';

export default function DriverProfile() {
  const router = useRouter();
  const bottomPad = useScrollBottomPadding();
  const logout = useAuth((s) => s.logout);
  const profile = useQuery({ queryKey: ['driver-me'], queryFn: () => api.driverMe() });

  if (profile.isLoading) return <Loading />;
  const d = profile.data;

  async function doLogout() {
    await logout();
    router.replace('/(auth)/welcome');
  }

  return (
    <Screen padded={false}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomPad }}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 30 }}>🧑‍✈️</Text>
          </View>
          <Text style={typography.h2}>{d?.user.name}</Text>
          <Text style={typography.caption}>{d?.user.phone}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <Badge
              text={d?.approvalStatus ?? ''}
              tone={d?.approvalStatus === 'APPROVED' ? 'success' : 'warning'}
            />
            <Badge text={`⭐ ${d?.rating.toFixed(1)}`} tone="neutral" />
          </View>
        </View>

        <Card>
          <Text style={typography.label}>VEHICLE</Text>
          {d?.vehicle ? (
            <>
              <Text style={typography.bodyStrong}>
                {VEHICLE_META[d.vehicle.category].emoji} {VEHICLE_META[d.vehicle.category].label} ·{' '}
                {d.vehicle.model}
              </Text>
              <Text style={typography.caption}>
                {d.vehicle.color} · {d.vehicle.registrationNumber}
              </Text>
            </>
          ) : (
            <Text style={typography.caption}>No vehicle on file</Text>
          )}
          <Text style={[typography.label, { marginTop: spacing.md }]}>TOTAL TRIPS</Text>
          <Text style={typography.bodyStrong}>{d?.totalTrips ?? 0}</Text>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <Text style={typography.label}>CONNECTED BACKEND</Text>
          <Text style={typography.caption}>{getApiBaseUrl()}</Text>
          <Text style={[typography.label, { marginTop: spacing.md }]}>SESSION</Text>
          <Text style={typography.caption}>Demo authentication (development only)</Text>
        </Card>

        <Button title="Log out" variant="danger" onPress={doLogout} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
