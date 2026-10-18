import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Coordinates } from '../lib/types';

interface MapMarker {
  coordinate: Coordinates;
  color: string;
}

interface MapRoute {
  coordinates: Coordinates[];
  color: string;
  width: number;
}

interface MapPayload {
  center: Coordinates;
  markers: { latitude: number; longitude: number; color: string }[];
  routes: { coordinates: number[][]; color: string; width: number }[];
}

interface MapSurfaceProps {
  center: Coordinates;
  markers?: MapMarker[];
  routes?: MapRoute[];
  onSelect?: (coordinate: Coordinates) => void;
  style: StyleProp<ViewStyle>;
}

const mapHtml = `
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #eef2ef; }
    .leaflet-control-attribution { font-size: 8px !important; }
  </style>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      if (!window.L) {
        document.getElementById('map').textContent = 'No se pudo cargar la biblioteca del mapa.';
        return;
      }
      var map = L.map('map', { zoomControl: true, attributionControl: true })
        .setView([9.7167, -75.12], 13);
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Sources: Esri, HERE, Garmin, USGS, Intermap, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, © OpenStreetMap contributors, GIS User Community'
        }
      ).addTo(map);
      var dataLayer = L.layerGroup().addTo(map);
      window.routewiseSetData = function (data) {
        dataLayer.clearLayers();
        data.routes.forEach(function (route) {
          if (route.coordinates.length > 1) {
            L.polyline(route.coordinates, {
              color: route.color,
              weight: route.width,
              opacity: 0.9
            }).addTo(dataLayer);
          }
        });
        data.markers.forEach(function (marker) {
          L.circleMarker([marker.latitude, marker.longitude], {
            radius: 8,
            color: '#ffffff',
            weight: 2,
            fillColor: marker.color,
            fillOpacity: 1
          }).addTo(dataLayer);
        });
        var points = [];
        data.routes.forEach(function (route) {
          points = points.concat(route.coordinates);
        });
        data.markers.forEach(function (marker) {
          points.push([marker.latitude, marker.longitude]);
        });
        if (points.length > 1) {
          map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 16 });
        } else if (points.length === 1) {
          map.setView(points[0], 15);
        } else {
          map.setView([data.center.latitude, data.center.longitude], 13);
        }
      };
      map.on('click', function (event) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'select',
            latitude: event.latlng.lat,
            longitude: event.latlng.lng
          }));
        }
      });
      setTimeout(function () { map.invalidateSize(); }, 150);
    })();
  </script>
</body>
</html>
`;

function isCoordinateMessage(value: unknown): value is { type: 'select'; latitude: number; longitude: number } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const message = value as Record<string, unknown>;
  return message.type === 'select'
    && typeof message.latitude === 'number'
    && Number.isFinite(message.latitude)
    && message.latitude >= -90
    && message.latitude <= 90
    && typeof message.longitude === 'number'
    && Number.isFinite(message.longitude)
    && message.longitude >= -180
    && message.longitude <= 180;
}

export function MapSurface({ center, markers = [], routes = [], onSelect, style }: MapSurfaceProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const payload = useMemo<MapPayload>(() => ({
    center,
    markers: markers.map(({ coordinate, color }) => ({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      color
    })),
    routes: routes.map((route) => ({
      coordinates: route.coordinates.map(({ latitude, longitude }) => [latitude, longitude]),
      color: route.color,
      width: route.width
    }))
  }), [center, markers, routes]);
  const serializedPayload = JSON.stringify(payload);

  useEffect(() => {
    if (isLoaded) {
      webViewRef.current?.injectJavaScript(`window.routewiseSetData(${serializedPayload}); true;`);
    }
  }, [isLoaded, serializedPayload]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (!onSelect) {
      return;
    }
    let message: unknown;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch (error) {
      console.error('The map sent an invalid selection message.', error);
      return;
    }
    if (isCoordinateMessage(message)) {
      onSelect({ latitude: message.latitude, longitude: message.longitude });
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        javaScriptEnabled
        onError={(event) => console.error('The mobile map failed to load.', event.nativeEvent.description)}
        onLoadEnd={() => setIsLoaded(true)}
        onMessage={handleMessage}
        originWhitelist={['*']}
        ref={webViewRef}
        source={{ html: mapHtml, baseUrl: 'https://routewise.local' }}
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  webView: { flex: 1, backgroundColor: '#eef2ef' }
});
