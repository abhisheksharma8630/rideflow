import React, { useMemo, useRef } from 'react';
import { DimensionValue, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radii, spacing } from '../theme';
import type { GeoPoint } from '../types';

/**
 * Real street map backed by Leaflet + OpenStreetMap tiles, rendered inside a
 * WebView so it runs in Expo Go with no native module and no API key.
 *
 * The map HTML is built once and never re-rendered on prop changes; the driver
 * marker (which moves every couple of seconds) is updated imperatively via
 * postMessage so the tiles never reload. If the WebView cannot be used
 * (e.g. the web build, or no coordinates yet) we fall back to the original
 * schematic grid.
 */
interface Props {
  pickup?: GeoPoint | null;
  destination?: GeoPoint | null;
  driver?: GeoPoint | null;
  height?: number;
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const valid = (p?: GeoPoint | null): p is GeoPoint =>
  !!p && isNum(p.latitude) && isNum(p.longitude);

export function MiniMap({ pickup, destination, driver, height = 220 }: Props) {
  const webRef = useRef<WebView>(null);

  const hasAnyPoint = valid(pickup) || valid(destination) || valid(driver);

  // Build the Leaflet HTML once. Pickup/destination are considered static for a
  // given ride; the driver position is pushed in later via postMessage. We key
  // the initial HTML on pickup/destination only so moving the driver does not
  // force a reload.
  const html = useMemo(
    () => buildLeafletHtml(pickup ?? null, destination ?? null, driver ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pickup?.latitude, pickup?.longitude, destination?.latitude, destination?.longitude],
  );

  // Push live driver updates into the already-loaded map.
  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!valid(driver)) return;
    webRef.current?.injectJavaScript(
      `window.__setDriver && window.__setDriver(${driver.latitude}, ${driver.longitude}); true;`,
    );
  }, [driver?.latitude, driver?.longitude]);

  // WebView is unavailable/less useful on the web output target; fall back.
  if (Platform.OS === 'web' || !hasAnyPoint) {
    return <SchematicMap pickup={pickup} destination={destination} driver={driver} height={height} />;
  }

  return (
    <View style={[styles.mapWrap, { height }]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        overScrollMode="never"
        androidLayerType="hardware"
        // Keep gestures inside the map from fighting the outer ScrollView.
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Loading map…</Text>
          </View>
        )}
      />
    </View>
  );
}

/** Build a self-contained Leaflet page. Tiles come from OpenStreetMap (free). */
function buildLeafletHtml(
  pickup: GeoPoint | null,
  destination: GeoPoint | null,
  driver: GeoPoint | null,
): string {
  const center = pickup ?? destination ?? driver ?? { latitude: 30.7333, longitude: 76.7794 };
  const p = pickup ? `[${pickup.latitude},${pickup.longitude}]` : 'null';
  const d = destination ? `[${destination.latitude},${destination.longitude}]` : 'null';
  const dr = driver ? `[${driver.latitude},${driver.longitude}]` : 'null';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #EAF1E8; }
    .pin { font-size: 26px; line-height: 26px; text-align: center; }
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var pickup = ${p};
    var destination = ${d};
    var driver = ${dr};

    var map = L.map('map', { zoomControl: true, attributionControl: true })
      .setView([${center.latitude}, ${center.longitude}], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    function emoji(sym) {
      return L.divIcon({ className: 'pin', html: sym, iconSize: [26, 26], iconAnchor: [13, 26] });
    }

    var markers = [];
    var bounds = [];

    if (pickup) {
      L.marker(pickup, { icon: emoji('🟢') }).addTo(map).bindPopup('Pickup');
      bounds.push(pickup);
    }
    if (destination) {
      L.marker(destination, { icon: emoji('🔴') }).addTo(map).bindPopup('Drop');
      bounds.push(destination);
    }
    if (pickup && destination) {
      L.polyline([pickup, destination], { color: '#F0A500', weight: 4, opacity: 0.8, dashArray: '6 8' }).addTo(map);
    }

    var driverMarker = null;
    window.__setDriver = function (lat, lng) {
      if (driverMarker) {
        driverMarker.setLatLng([lat, lng]);
      } else {
        driverMarker = L.marker([lat, lng], { icon: emoji('🛵') }).addTo(map);
      }
    };
    if (driver) { window.__setDriver(driver[0], driver[1]); bounds.push(driver); }

    if (bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }
  </script>
</body>
</html>`;
}

/**
 * Schematic map fallback (no coordinates / web target). Renders pickup,
 * destination and optional driver markers on a simple projected grid. This is
 * NOT a real street map and is clearly watermarked.
 */
export function SchematicMap({ pickup, destination, driver, height = 220 }: Props) {
  const pts = [pickup, destination, driver].filter(valid) as GeoPoint[];
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
    <View style={[styles.schematic, { height }]}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={`h${i}`} style={[styles.gridLine, { top: `${(i + 1) * 16}%` as DimensionValue }]} />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={`v${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 16}%` as DimensionValue }]} />
      ))}

      {valid(pickup) ? (
        <View style={[styles.marker, project(pickup)]}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={styles.markerLabel}>Pickup</Text>
        </View>
      ) : null}
      {valid(destination) ? (
        <View style={[styles.marker, project(destination)]}>
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          <Text style={styles.markerLabel}>Drop</Text>
        </View>
      ) : null}
      {valid(driver) ? (
        <View style={[styles.marker, project(driver)]}>
          <Text style={{ fontSize: 22 }}>🛵</Text>
        </View>
      ) : null}

      <View style={styles.watermark}>
        <Text style={styles.watermarkText}>Schematic view · no map tiles</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#EAF1E8',
  },
  webview: { flex: 1, backgroundColor: '#EAF1E8' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  schematic: {
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
