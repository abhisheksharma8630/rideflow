import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Loading, Screen } from '../../components/ui';
import { MiniMap } from '../../components/MiniMap';
import { colors, formatCurrency, radii, spacing, typography, VEHICLE_META } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/auth';
import { PRESET_PLACES, NamedPlace, haversineKm } from '../../features/locations';
import { ACTIVE_RIDE_STATUSES } from '../../features/rideStatus';
import type { GeoPoint, VehicleCategory } from '../../types';

type Step = 'pickup' | 'destination' | 'vehicle';

export default function CustomerHome() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [pickup, setPickup] = useState<NamedPlace | null>(null);
  const [destination, setDestination] = useState<NamedPlace | null>(null);
  const [category, setCategory] = useState<VehicleCategory>('BIKE');
  const [picker, setPicker] = useState<Step | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  // Detect an existing active ride and jump straight to it.
  const activeRide = useQuery({
    queryKey: ['active-ride'],
    queryFn: async () => {
      const res = await api.myRides(1, 5);
      return res.items.find((r) => ACTIVE_RIDE_STATUSES.includes(r.status)) ?? null;
    },
  });

  useEffect(() => {
    if (activeRide.data) {
      router.replace(`/(customer)/ride/${activeRide.data.id}`);
    }
  }, [activeRide.data, router]);

  // Try to get device location for pickup; fall back to a preset.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationNote('Location permission denied — pick your pickup manually.');
          setPickup(PRESET_PLACES[0]);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setPickup({
          address: 'Current location',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } catch {
        setLocationNote('Could not read device location — using a sample pickup.');
        setPickup(PRESET_PLACES[0]);
      }
    })();
  }, []);

  const distanceKm = useMemo(
    () => (pickup && destination ? haversineKm(pickup, destination) : 0),
    [pickup, destination],
  );

  // Live fare estimates per category from the backend.
  const estimates = useQuery({
    queryKey: ['estimates', pickup?.latitude, pickup?.longitude, destination?.latitude, destination?.longitude],
    enabled: !!pickup && !!destination,
    queryFn: async () => {
      const cats: VehicleCategory[] = ['BIKE', 'AUTO', 'CAB'];
      const results = await Promise.all(
        cats.map(async (c) => {
          try {
            const e = await api.estimate(c, pickup!, destination!);
            return [c, e] as const;
          } catch {
            return [c, null] as const;
          }
        }),
      );
      return Object.fromEntries(results) as Record<VehicleCategory, Awaited<ReturnType<typeof api.estimate>> | null>;
    },
  });

  async function book() {
    if (!pickup || !destination) return;
    setBooking(true);
    try {
      const ride = await api.createRide({
        vehicleCategory: category,
        pickupAddress: pickup.address,
        pickup: { latitude: pickup.latitude, longitude: pickup.longitude },
        destinationAddress: destination.address,
        destination: { latitude: destination.latitude, longitude: destination.longitude },
        paymentMethod: 'CASH',
      });
      router.replace(`/(customer)/ride/${ride.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Booking failed';
      Alert.alert('Could not book', msg);
    } finally {
      setBooking(false);
    }
  }

  if (activeRide.isLoading) return <Loading label="Loading…" />;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={typography.caption}>Hi {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
            <Text style={typography.h2}>Where to?</Text>
          </View>
          <View style={styles.logo}>
            <Text style={{ fontWeight: '900', color: colors.charcoal }}>RF</Text>
          </View>
        </View>

        <MiniMap pickup={pickup} destination={destination} height={200} />

        {locationNote ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>{locationNote}</Text>
          </View>
        ) : null}

        <Card style={{ marginTop: spacing.lg }}>
          <Pressable style={styles.locRow} onPress={() => setPicker('pickup')}>
            <View style={[styles.locDot, { backgroundColor: colors.success }]} />
            <View style={{ flex: 1 }}>
              <Text style={typography.label}>PICKUP</Text>
              <Text style={typography.bodyStrong} numberOfLines={1}>
                {pickup?.address ?? 'Select pickup'}
              </Text>
            </View>
            <Text style={styles.change}>Change</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.locRow} onPress={() => setPicker('destination')}>
            <View style={[styles.locDot, { backgroundColor: colors.danger }]} />
            <View style={{ flex: 1 }}>
              <Text style={typography.label}>DESTINATION</Text>
              <Text style={typography.bodyStrong} numberOfLines={1}>
                {destination?.address ?? 'Search destination'}
              </Text>
            </View>
            <Text style={styles.change}>{destination ? 'Change' : 'Select'}</Text>
          </Pressable>
        </Card>

        {pickup && destination ? (
          <>
            <View style={styles.rowBetween}>
              <Text style={[typography.h3, { marginTop: spacing.lg }]}>Choose a ride</Text>
              <Text style={[typography.caption, { marginTop: spacing.lg }]}>
                ~{distanceKm.toFixed(1)} km
              </Text>
            </View>
            <Text style={[typography.caption, { marginBottom: spacing.sm }]}>
              Fares are estimated without a routing provider (straight-line distance).
            </Text>

            {(['BIKE', 'AUTO', 'CAB'] as VehicleCategory[]).map((c) => {
              const est = estimates.data?.[c];
              const meta = VEHICLE_META[c];
              const selected = category === c;
              return (
                <Pressable key={c} onPress={() => setCategory(c)}>
                  <Card
                    style={[
                      styles.vehicleRow,
                      selected ? { borderColor: colors.primary, borderWidth: 2 } : null,
                    ]}
                  >
                    <Text style={{ fontSize: 30, marginRight: spacing.md }}>{meta.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={typography.bodyStrong}>{meta.label}</Text>
                      <Text style={typography.caption}>{meta.description}</Text>
                      {est ? (
                        <Text style={[typography.caption, { marginTop: 2 }]}>
                          {est.durationMinutes} min · arrives ~3 min
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {estimates.isLoading ? (
                        <Text style={typography.caption}>…</Text>
                      ) : est ? (
                        <Text style={typography.h3}>{formatCurrency(est.total)}</Text>
                      ) : (
                        <Badge text="N/A" tone="neutral" />
                      )}
                    </View>
                  </Card>
                </Pressable>
              );
            })}

            <Button
              title={`Book ${VEHICLE_META[category].label}`}
              onPress={book}
              loading={booking}
              disabled={!estimates.data?.[category]}
              style={{ marginTop: spacing.md }}
            />
          </>
        ) : (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.h3, { marginBottom: spacing.sm }]}>Saved places</Text>
            {PRESET_PLACES.slice(0, 4).map((p) => (
              <Pressable key={p.address} onPress={() => setDestination(p)}>
                <Card style={styles.savedRow}>
                  <Text style={{ fontSize: 18, marginRight: spacing.sm }}>📍</Text>
                  <Text style={[typography.body, { flex: 1 }]} numberOfLines={1}>
                    {p.address}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <PlacePicker
        visible={picker !== null}
        title={picker === 'pickup' ? 'Select pickup' : 'Select destination'}
        onClose={() => setPicker(null)}
        onSelect={(p) => {
          if (picker === 'pickup') setPickup(p);
          else setDestination(p);
          setPicker(null);
        }}
      />
    </Screen>
  );
}

function PlacePicker({
  visible,
  title,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (p: NamedPlace) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = PRESET_PLACES.filter((p) =>
    p.address.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.rowBetween}>
            <Text style={typography.h3}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>Close</Text>
            </Pressable>
          </View>
          <TextInput
            placeholder="Search a place in Chandigarh"
            placeholderTextColor={colors.muted}
            value={q}
            onChangeText={setQ}
            style={styles.search}
          />
          <ScrollView style={{ maxHeight: 360 }}>
            {filtered.map((p) => (
              <Pressable key={p.address} onPress={() => onSelect(p)} style={styles.pickRow}>
                <Text style={{ fontSize: 18, marginRight: spacing.sm }}>📍</Text>
                <Text style={[typography.body, { flex: 1 }]}>{p.address}</Text>
              </Pressable>
            ))}
            {filtered.length === 0 ? (
              <Text style={[typography.caption, { padding: spacing.md }]}>No matches.</Text>
            ) : null}
          </ScrollView>
          <Text style={[typography.caption, { marginTop: spacing.sm }]}>
            Preset locations are used as a no-credentials fallback for the demo.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { backgroundColor: '#FFF3D6', borderRadius: radii.md, padding: spacing.sm, marginTop: spacing.sm },
  noteText: { fontSize: 12, color: '#9A6B00', fontWeight: '600' },
  locRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  locDot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 24 },
  change: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  savedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, paddingVertical: spacing.md },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
  },
  search: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.md,
    color: colors.ink,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
