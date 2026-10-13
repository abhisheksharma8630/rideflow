import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, ErrorState, Loading, Screen, useScrollBottomPadding } from '../../../components/ui';
import { MiniMap } from '../../../components/MiniMap';
import { colors, formatCurrency, radii, spacing, typography } from '../../../theme';
import { api } from '../../../services/api';
import { connectSocket, subscribeRide } from '../../../services/socket';
import { rideStatusLabel, rideStatusTone } from '../../../features/rideStatus';
import type { DriverLocationEvent, GeoPoint, RideDTO } from '../../../types';
import { SOCKET_EVENTS } from '../../../types';

const STEPS = ['SEARCHING', 'ACCEPTED', 'ARRIVED_AT_PICKUP', 'IN_PROGRESS', 'COMPLETED'];

export default function CustomerRide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [driverPos, setDriverPos] = useState<GeoPoint | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [rated, setRated] = useState(false);
  const bottomPad = useScrollBottomPadding();

  const ride = useQuery({
    queryKey: ['ride', id],
    queryFn: () => api.getRide(id),
    refetchInterval: (q) => {
      const data = q.state.data as RideDTO | undefined;
      // Poll as a safety net; socket is primary. Stop once terminal.
      if (data && ['COMPLETED', 'CANCELLED', 'NO_DRIVERS'].includes(data.status)) return false;
      return 4000;
    },
  });

  // Socket: subscribe to this ride and apply live updates.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const socket = await connectSocket();
      const applyRide = (r: RideDTO) => {
        if (!mounted || r.id !== id) return;
        qc.setQueryData(['ride', id], r);
      };
      const onLoc = (e: DriverLocationEvent) => {
        if (e.rideId === id) setDriverPos(e.location);
      };
      socket.on(SOCKET_EVENTS.RIDE_UPDATE, applyRide);
      socket.on(SOCKET_EVENTS.RIDE_COMPLETED, applyRide);
      socket.on(SOCKET_EVENTS.RIDE_CANCELLED, applyRide);
      socket.on(SOCKET_EVENTS.DRIVER_LOCATION, onLoc);
      // Refetch authoritative state on (re)connect.
      socket.on('connect', () => {
        subscribeRide(id);
        void qc.invalidateQueries({ queryKey: ['ride', id] });
      });
      subscribeRide(id);

      return () => {
        socket.off(SOCKET_EVENTS.RIDE_UPDATE, applyRide);
        socket.off(SOCKET_EVENTS.RIDE_COMPLETED, applyRide);
        socket.off(SOCKET_EVENTS.RIDE_CANCELLED, applyRide);
        socket.off(SOCKET_EVENTS.DRIVER_LOCATION, onLoc);
      };
    })();
    return () => {
      mounted = false;
    };
  }, [id, qc]);

  async function cancel() {
    Alert.alert('Cancel ride?', 'Are you sure you want to cancel this ride?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await api.cancelRide(id, 'Cancelled by customer');
            await qc.invalidateQueries({ queryKey: ['ride', id] });
          } catch (e) {
            Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Error');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }

  async function rate(score: number) {
    try {
      await api.rateRide(id, score);
      setRated(true);
    } catch (e) {
      Alert.alert('Could not submit rating', e instanceof Error ? e.message : 'Error');
    }
  }

  if (ride.isLoading) return <Loading label="Loading your ride…" />;
  if (ride.isError || !ride.data)
    return (
      <Screen>
        <ErrorState message="Could not load this ride." onRetry={() => ride.refetch()} />
      </Screen>
    );

  const r = ride.data;
  const canCancel = ['SEARCHING', 'ACCEPTED', 'ARRIVED_AT_PICKUP'].includes(r.status);
  const currentStepIndex = STEPS.indexOf(r.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : r.status);

  return (
    <Screen padded={false}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.rowBetween}>
          <Text style={typography.h2}>{rideStatusLabel(r.status)}</Text>
          <Badge text={r.status} tone={rideStatusTone(r.status)} />
        </View>
        <Text style={[typography.caption, { marginBottom: spacing.md }]}>Ride #{r.id.slice(-6)}</Text>

        <MiniMap
          pickup={{ latitude: r.pickupLat, longitude: r.pickupLng }}
          destination={{ latitude: r.destinationLat, longitude: r.destinationLng }}
          driver={driverPos}
          height={200}
        />

        {/* progress tracker */}
        <Card style={{ marginTop: spacing.lg }}>
          {STEPS.filter((s) => s !== 'COMPLETED' || r.status === 'COMPLETED').map((s, i) => {
            const done = currentStepIndex >= i && currentStepIndex >= 0;
            return (
              <View key={s} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    { backgroundColor: done ? colors.success : colors.border },
                  ]}
                />
                <Text style={[typography.body, done ? { fontWeight: '700' } : { color: colors.muted }]}>
                  {rideStatusLabel(s as RideDTO['status'])}
                </Text>
              </View>
            );
          })}
        </Card>

        {r.status === 'NO_DRIVERS' ? (
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={typography.bodyStrong}>No captains available right now</Text>
            <Text style={[typography.caption, { marginVertical: spacing.sm }]}>
              All nearby captains for this category are busy or offline. Please try again.
            </Text>
            <Button title="Back to home" onPress={() => router.replace('/(customer)/home')} />
          </Card>
        ) : null}

        {r.driver ? (
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.driverRow}>
              <View style={styles.avatar}>
                <Text style={{ fontSize: 24 }}>🧑‍✈️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyStrong}>{r.driver.name}</Text>
                <Text style={typography.caption}>⭐ {r.driver.rating.toFixed(1)}</Text>
                {r.driver.vehicle ? (
                  <Text style={typography.caption}>
                    {r.driver.vehicle.model} · {r.driver.vehicle.color} ·{' '}
                    {r.driver.vehicle.registrationNumber}
                  </Text>
                ) : null}
              </View>
              <Pressable
                style={styles.callBtn}
                onPress={() => Alert.alert('Contact captain', `Demo placeholder — ${r.driver?.phone}`)}
              >
                <Text style={{ fontSize: 18 }}>📞</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        <Card style={{ marginTop: spacing.lg }}>
          <Row label="Pickup" value={r.pickupAddress} />
          <Row label="Destination" value={r.destinationAddress} />
          <Row label="Distance" value={`~${r.estimatedDistanceKm.toFixed(1)} km (est, no routing)`} />
          <Row
            label={r.finalFare != null ? 'Final fare' : 'Estimated fare'}
            value={formatCurrency(r.finalFare ?? r.estimatedFare)}
            strong
          />
          <Row label="Payment" value={r.payment?.method === 'ONLINE_DEMO' ? 'Online (demo)' : 'Cash'} />
        </Card>

        {r.status === 'COMPLETED' && !rated ? (
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={typography.h3}>Rate your captain</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => rate(n)} hitSlop={8}>
                  <Text style={{ fontSize: 34 }}>⭐</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        {rated ? (
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={[typography.bodyStrong, { color: colors.success }]}>Thanks for your rating! 🙌</Text>
          </Card>
        ) : null}

        {canCancel ? (
          <Button
            title="Cancel ride"
            variant="danger"
            onPress={cancel}
            loading={cancelling}
            style={{ marginTop: spacing.lg }}
          />
        ) : null}

        {['COMPLETED', 'CANCELLED'].includes(r.status) ? (
          <Button
            title="Back to home"
            variant="secondary"
            onPress={() => router.replace('/(customer)/home')}
            style={{ marginTop: spacing.md }}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={[strong ? typography.h3 : typography.bodyStrong, { flexShrink: 1, textAlign: 'right' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  stepDot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.md },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  stars: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
});
