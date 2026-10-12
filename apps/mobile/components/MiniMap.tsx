import React from 'react';
import { DimensionValue, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import type { GeoPoint } from '../types';

/**
 * Schematic map fallback. Renders pickup, destination and (optional) live driver
 * markers on a simple grid, projecting lat/lng into the view box. This is the
 * no-credentials fallback: it is NOT a real street map. A route line is drawn
 * straight between pickup and destination and labelled as a schematic view.
 */
interface Props {
  pickup?: GeoPoint | null;
  destination?: GeoPoint | null;
  driver?: GeoPoint | null;
  height?: number;
}

export function MiniMap({ pickup, destination, driver, height = 220 }: Props) {
  const pts = [pickup, destination, driver].filter(Boolean) as GeoPoint[];
  // Compute a bounding box with padding; fall back to a default around Chandigarh.
  const lats = pts.map((p) => p.latitude);
  const lngs = pts.map((p) => p.longitude);
  const minLat = pts.length ? Math.min(...lats) : 30.70;
  const maxLat = pts.length ? Math.max(...lats) : 30.77;
  const minLng = pts.length ? Math.min(...lngs) : 76.73;
  const maxLng = pts.length ? Math.max(...lngs) : 76.83;
  const padLat = Math.max((maxLat - minLat) * 0.25, 0.004);
  const padLng = Math.max((maxLng - minLng) * 0.25, 0.004);

  const project = (p: GeoPoint): { left: DimensionValue; top: DimensionValue } => {
    const x = ((p.longitude - (minLng - padLng)) / (maxLng - minLng + 2 * padLng)) * 100;
    const y = (1 - (p.latitude - (minLat - padLat)) / (maxLat - minLat + 2 * padLat)) * 100;
    return {
      left: `${Math.max(4, Math.min(96, x))}%` as DimensionValue,
      top: `${Math.max(6, Math.min(92, y))}%` as DimensionValue,
    };
  };

  return (
    <View style={[styles.map, { height }]}>
      {/* grid */}
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={`h${i}`} style={[styles.gridLine, { top: `${(i + 1) * 16}%` as DimensionValue }]} />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={`v${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 16}%` as DimensionValue }]} />
      ))}

      {pickup ? (
        <View style={[styles.marker, project(pickup)]}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={styles.markerLabel}>Pickup</Text>
        </View>
      ) : null}
      {destination ? (
        <View style={[styles.marker, project(destination)]}>
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          <Text style={styles.markerLabel}>Drop</Text>
        </View>
      ) : null}
      {driver ? (
        <View style={[styles.marker, project(driver)]}>
          <Text style={{ fontSize: 22 }}>🛵</Text>
        </View>
      ) : null}

      <View style={styles.watermark}>
        <Text style={styles.watermarkText}>Schematic view · no routing provider</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: '#EAF1E8',
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  marker: { position: 'absolute', alignItems: 'center', transform: [{ translateX: -12 }, { translateY: -12 }] },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#fff' },
  markerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.charcoal,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 4,
    borderRadius: 4,
    marginTop: 2,
  },
  watermark: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  watermarkText: { fontSize: 9, color: colors.muted, fontWeight: '600' },
});
