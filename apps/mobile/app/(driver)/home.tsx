import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Loading, Screen } from '../../components/ui';
import { MiniMap } from '../../components/MiniMap';
import { colors, formatCurrency, radii, spacing, typography, VEHICLE_META } from '../../theme';
import { api } from '../../services/api';
import { connectSocket, subscribeRide } from '../../services/socket';
import { rideStatusLabel, rideStatusTone, ACTIVE_RIDE_STATUSES } from '../../features/rideStatus';
import type { RideDTO, RideOfferDTO } from '../../types';
import { SOCKET_EVENTS } from '../../types';

export default function DriverHome() {
  const qc = useQueryClient();
  const [offer, setOffer] = useState<RideOfferDTO | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const profile = useQuery({ queryKey: ['driver-me'], queryFn: () => api.driverMe() });
  const earnings = useQuery({ queryKey: ['driver-earnings'], queryFn: () => api.driverEarnings() });

  // Determine current active ride (if any) from driver ride list.
  const activeRideQ = useQuery({
    queryKey: ['driver-active-ride'],
    queryFn: async () => {
      const res = await api.driverRides(1, 5);
      return res.items.find((r) => ACTIVE_RIDE_STATUSES.includes(r.status)) ?? null;
    },
    refetchInterval: 5000,
  });
  const activeRide = activeRideQ.data;

  const online = profile.data?.availabilityStatus === 'ONLINE' || profile.data?.availabilityStatus === 'ON_TRIP';
  const approved = profile.data?.approvalStatus === 'APPROVED';

  // Socket: offers + ride updates.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const socket = await connectSocket();
      const onOffer = (o: RideOfferDTO) => {
        if (!mounted) return;
        setOffer(o);
        const secs = Math.max(0, Math.round((new Date(o.expiresAt).getTime() - Date.now()) / 1000));
        setSecondsLeft(secs);
      };
      const onExpired = () => {
        if (mounted) setOffer(null);
      };
      const onRideUpdate = (r: RideDTO) => {
        qc.setQueryData(['driver-active-ride'], (prev: RideDTO | null | undefined) =>
          r.driverId === profile.data?.id && ACTIVE_RIDE_STATUSES.includes(r.status) ? r : prev,
        );
        void qc.invalidateQueries({ queryKey: ['driver-active-ride'] });
        void qc.invalidateQueries({ queryKey: ['driver-earnings'] });
      };
      socket.on(SOCKET_EVENTS.RIDE_OFFER, onOffer);
      socket.on(SOCKET_EVENTS.OFFER_EXPIRED, onExpired);
      socket.on(SOCKET_EVENTS.RIDE_UPDATE, onRideUpdate);
      socket.on(SOCKET_EVENTS.RIDE_COMPLETED, onRideUpdate);
      socket.on('connect', () => void qc.invalidateQueries({ queryKey: ['driver-active-ride'] }));
      return () => {
        socket.off(SOCKET_EVENTS.RIDE_OFFER, onOffer);
        socket.off(SOCKET_EVENTS.OFFER_EXPIRED, onExpired);
        socket.off(SOCKET_EVENTS.RIDE_UPDATE, onRideUpdate);
        socket.off(SOCKET_EVENTS.RIDE_COMPLETED, onRideUpdate);
      };
    })();
    return () => {
      mounted = false;
    };
  }, [qc, profile.data?.id]);

  // Offer countdown.
  useEffect(() => {
    if (!offer) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setOffer(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [offer]);

  async function toggleOnline(value: boolean) {
    if (!approved) {
      Alert.alert('Not approved', 'Your account is pending admin approval and cannot go online yet.');
      return;
    }
    try {
      await api.setAvailability(value ? 'ONLINE' : 'OFFLINE');
      await qc.invalidateQueries({ queryKey: ['driver-me'] });
    } catch (e) {
      Alert.alert('Could not update status', e instanceof Error ? e.message : 'Error');
    }
  }

  async function acceptOffer() {
    if (!offer) return;
    setBusy(true);
    try {
      const ride = await api.accept(offer.rideId);
      setOffer(null);
      subscribeRide(ride.id);
      qc.setQueryData(['driver-active-ride'], ride);
      await qc.invalidateQueries({ queryKey: ['driver-me'] });
    } catch (e) {
      setOffer(null);
      Alert.alert('Offer unavailable', e instanceof Error ? e.message : 'This ride was taken.');
    } finally {
      setBusy(false);
    }
  }

  async function rejectOffer() {
    if (!offer) return;
    const rideId = offer.rideId;
    setOffer(null);
    try {
      await api.reject(rideId);
    } catch {
      /* ignore */
    }
  }

  async function advance(action: 'arrive' | 'start' | 'complete') {
    if (!activeRide) return;
    setBusy(true);
    try {
      const fn = action === 'arrive' ? api.arrive : action === 'start' ? api.start : api.complete;
      const ride = await fn(activeRide.id);
      qc.setQueryData(['driver-active-ride'], ACTIVE_RIDE_STATUSES.includes(ride.status) ? ride : null);
      await qc.invalidateQueries({ queryKey: ['driver-active-ride'] });
      await qc.invalidateQueries({ queryKey: ['driver-earnings'] });
      await qc.invalidateQueries({ queryKey: ['driver-me'] });
    } catch (e) {
      Alert.alert('Action failed', e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (profile.isLoading) return <Loading label="Loading captain dashboard…" />;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
        <Text style={typography.h2}>Captain dashboard</Text>
        <Text style={typography.caption}>
          {profile.data?.user.name} · {profile.data?.vehicle ? VEHICLE_META[profile.data.vehicle.category].label : '—'}
        </Text>

        {/* Online toggle */}
        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={typography.bodyStrong}>{online ? 'You are online' : 'You are offline'}</Text>
              <Text style={typography.caption}>
                {approved ? 'Approved captain' : 'Pending approval — cannot accept rides'}
              </Text>
            </View>
            <Switch
              value={online}
              onValueChange={toggleOnline}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={online ? colors.charcoal : '#fff'}
              disabled={profile.data?.availabilityStatus === 'ON_TRIP'}
            />
          </View>
          {!approved ? (
            <Badge text="PENDING APPROVAL" tone="warning" />
          ) : null}
        </Card>

        {/* Incoming offer */}
        {offer ? (
          <Card style={[styles.offerCard, { marginTop: spacing.lg }]}>
            <View style={styles.rowBetween}>
              <Text style={typography.h3}>New ride request</Text>
              <Badge text={`${secondsLeft}s`} tone={secondsLeft <= 5 ? 'danger' : 'info'} />
            </View>
            <Text style={[typography.bodyStrong, { marginTop: spacing.sm }]}>
              {VEHICLE_META[offer.ride.vehicleCategory].emoji} {VEHICLE_META[offer.ride.vehicleCategory].label} ·{' '}
              {formatCurrency(offer.estimatedEarnings)} est. earnings
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <Text style={typography.caption}>Pickup · {offer.distanceToPickupKm} km away</Text>
              <Text style={typography.body} numberOfLines={1}>📍 {offer.ride.pickupAddress}</Text>
              <Text style={[typography.body, { marginTop: 4 }]} numberOfLines={1}>
                🏁 {offer.ride.destinationAddress}
              </Text>
              <Text style={[typography.caption, { marginTop: 4 }]}>
                Trip ~{offer.ride.estimatedDistanceKm.toFixed(1)} km · {offer.ride.estimatedDurationMinutes} min
              </Text>
            </View>
            <View style={styles.offerActions}>
              <Button title="Reject" variant="secondary" onPress={rejectOffer} style={{ flex: 1 }} />
              <Button title="Accept" variant="success" onPress={acceptOffer} loading={busy} style={{ flex: 1 }} />
            </View>
          </Card>
        ) : null}

        {/* Active trip */}
        {activeRide ? (
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.rowBetween}>
              <Text style={typography.h3}>Active trip</Text>
              <Badge text={rideStatusLabel(activeRide.status)} tone={rideStatusTone(activeRide.status)} />
            </View>
            <MiniMap
              pickup={{ latitude: activeRide.pickupLat, longitude: activeRide.pickupLng }}
              destination={{ latitude: activeRide.destinationLat, longitude: activeRide.destinationLng }}
              height={160}
            />
            <View style={{ marginTop: spacing.sm }}>
              <Text style={typography.caption}>Rider</Text>
              <Text style={typography.bodyStrong}>{activeRide.customer?.name ?? 'Rider'}</Text>
              <Text style={[typography.caption, { marginTop: spacing.sm }]}>Pickup</Text>
              <Text style={typography.body}>{activeRide.pickupAddress}</Text>
              <Text style={[typography.caption, { marginTop: spacing.sm }]}>Destination</Text>
              <Text style={typography.body}>{activeRide.destinationAddress}</Text>
              <Text style={[typography.h3, { marginTop: spacing.sm }]}>
                {formatCurrency(activeRide.finalFare ?? activeRide.estimatedFare)}
              </Text>
            </View>

            {activeRide.status === 'ACCEPTED' ? (
              <Button title="I've arrived at pickup" onPress={() => advance('arrive')} loading={busy} style={{ marginTop: spacing.md }} />
            ) : null}
            {activeRide.status === 'ARRIVED_AT_PICKUP' ? (
              <Button title="Start trip" variant="success" onPress={() => advance('start')} loading={busy} style={{ marginTop: spacing.md }} />
            ) : null}
            {activeRide.status === 'IN_PROGRESS' ? (
              <>
                <View style={styles.simNote}>
                  <Text style={styles.simNoteText}>
                    Simulated movement is running on the server. The rider sees live position updates.
                  </Text>
                </View>
                <Button title="Complete trip now" onPress={() => advance('complete')} loading={busy} style={{ marginTop: spacing.md }} />
              </>
            ) : null}
          </Card>
        ) : online && approved && !offer ? (
          <Card style={{ marginTop: spacing.lg, alignItems: 'center' }}>
            <Text style={{ fontSize: 40 }}>🛵</Text>
            <Text style={[typography.bodyStrong, { marginTop: spacing.sm }]}>Waiting for ride requests…</Text>
            <Text style={[typography.caption, { textAlign: 'center' }]}>
              Keep this screen open. New requests appear here instantly.
            </Text>
          </Card>
        ) : null}

        {/* Today summary */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={typography.h3}>Today</Text>
          <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
            <Metric label="Trips" value={`${earnings.data?.todayTrips ?? 0}`} />
            <Metric label="Earnings" value={formatCurrency(earnings.data?.todayGrossEarnings ?? 0)} />
            <Metric label="Rating" value={`⭐ ${profile.data?.rating.toFixed(1) ?? '5.0'}`} />
          </View>
        </Card>
      </ScrollView>
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
  offerCard: { borderWidth: 2, borderColor: colors.primary },
  offerActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  simNote: { backgroundColor: '#E7F0FD', borderRadius: radii.md, padding: spacing.sm, marginTop: spacing.md },
  simNoteText: { fontSize: 12, color: '#1A62C9', fontWeight: '600' },
});
