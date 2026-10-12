import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, EmptyState, ErrorState, Loading, Screen } from '../../components/ui';
import { colors, formatCurrency, spacing, typography, VEHICLE_META } from '../../theme';
import { api } from '../../services/api';
import { rideStatusLabel, rideStatusTone } from '../../features/rideStatus';

export default function History() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['my-rides'], queryFn: () => api.myRides(1, 50) });

  if (q.isLoading) return <Loading />;
  if (q.isError)
    return (
      <Screen>
        <ErrorState message="Could not load your rides." onRetry={() => q.refetch()} />
      </Screen>
    );

  const rides = q.data?.items ?? [];

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Text style={typography.h1}>Your rides</Text>
        <Text style={typography.caption}>Completed and cancelled trips</Text>
      </View>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        data={rides}
        keyExtractor={(r) => r.id}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        ListEmptyComponent={
          <EmptyState title="No rides yet" subtitle="Book your first ride from the Ride tab." emoji="🛺" />
        }
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={styles.rowBetween}>
              <Text style={typography.bodyStrong}>
                {VEHICLE_META[item.vehicleCategory].emoji} {VEHICLE_META[item.vehicleCategory].label}
              </Text>
              <Badge text={rideStatusLabel(item.status)} tone={rideStatusTone(item.status)} />
            </View>
            <Text style={[typography.caption, { marginTop: spacing.xs }]} numberOfLines={1}>
              {item.pickupAddress} → {item.destinationAddress}
            </Text>
            <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
              <Text style={typography.caption}>
                {new Date(item.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={typography.bodyStrong}>
                {formatCurrency(item.finalFare ?? item.estimatedFare)}
              </Text>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
