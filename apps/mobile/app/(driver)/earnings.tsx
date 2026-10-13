import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, EmptyState, Loading, Screen, useScrollBottomPadding } from '../../components/ui';
import { colors, formatCurrency, spacing, typography, VEHICLE_META } from '../../theme';
import { api } from '../../services/api';
import { rideStatusLabel, rideStatusTone } from '../../features/rideStatus';

export default function Earnings() {
  const bottomPad = useScrollBottomPadding();
  const earnings = useQuery({ queryKey: ['driver-earnings'], queryFn: () => api.driverEarnings() });
  const rides = useQuery({ queryKey: ['driver-rides'], queryFn: () => api.driverRides(1, 50) });

  if (earnings.isLoading || rides.isLoading) return <Loading />;

  const completed = (rides.data?.items ?? []).filter((r) => r.status === 'COMPLETED');

  return (
    <Screen padded={false}>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomPad }}
        data={completed}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          <View>
            <Text style={typography.h1}>Earnings</Text>
            <Card style={{ marginTop: spacing.md }}>
              <View style={styles.rowBetween}>
                <Metric label="Total trips" value={`${earnings.data?.totalTrips ?? 0}`} />
                <Metric label="Gross" value={formatCurrency(earnings.data?.grossEarnings ?? 0)} />
                <Metric label="Est. net" value={formatCurrency(earnings.data?.estimatedNetEarnings ?? 0)} />
              </View>
              <View style={styles.commission}>
                <Text style={styles.commissionText}>
                  Commission {Math.round((earnings.data?.commissionRate ?? 0.2) * 100)}% · {earnings.data?.note}
                </Text>
              </View>
            </Card>
            <Text style={[typography.h3, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
              Completed trips
            </Text>
          </View>
        }
        ListEmptyComponent={<EmptyState title="No completed trips yet" emoji="💸" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={styles.rowBetween}>
              <Text style={typography.bodyStrong}>
                {VEHICLE_META[item.vehicleCategory].emoji} {item.customer?.name ?? 'Rider'}
              </Text>
              <Badge text={rideStatusLabel(item.status)} tone={rideStatusTone(item.status)} />
            </View>
            <Text style={[typography.caption, { marginTop: spacing.xs }]} numberOfLines={1}>
              {item.pickupAddress} → {item.destinationAddress}
            </Text>
            <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
              <Text style={typography.caption}>
                {item.completedAt
                  ? new Date(item.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : ''}
              </Text>
              <Text style={typography.bodyStrong}>{formatCurrency(item.finalFare ?? item.estimatedFare)}</Text>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={typography.h3}>{value}</Text>
      <Text style={typography.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commission: { backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: spacing.sm, marginTop: spacing.md },
  commissionText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
});
