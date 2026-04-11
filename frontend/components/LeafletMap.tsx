import React, { useRef, useImperativeHandle, forwardRef, useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface MapLocation {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  address: string;
  category: string;
}

interface LeafletMapProps {
  locations: MapLocation[];
  userLatitude?: number;
  userLongitude?: number;
  onMarkerPress?: (locationId: string) => void;
  markerColors: Record<string, string>;
  centerLat: number;
  centerLng: number;
}

export interface LeafletMapRef {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

const MARKER_COLORS_DEFAULT: Record<string, string> = {
  restaurant: '#FF6B6B',
  market: '#4ECDC4',
  auto_service: '#45B7D1',
  cafe: '#96CEB4',
  pharmacy: '#FFEAA7',
  gas_station: '#DDA0DD',
};

function generateHTML(
  locations: MapLocation[],
  markerColors: Record<string, string>,
  centerLat: number,
  centerLng: number,
  userLat?: number,
  userLng?: number
): string {
  const markers = locations
    .map((loc) => {
      const color = markerColors[loc.category] || '#D97757';
      const escapedName = loc.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const escapedAddr = loc.address.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      return `
        L.circleMarker([${loc.latitude}, ${loc.longitude}], {
          radius: 10, fillColor: '${color}', color: '#fff', weight: 2.5, fillOpacity: 0.9
        }).addTo(map)
          .bindPopup('<b>${escapedName}</b><br/>${escapedAddr}')
          .on('click', function() {
            try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'marker',id:'${loc.id}'})); } catch(e) {}
            try { window.parent.postMessage(JSON.stringify({type:'marker',id:'${loc.id}'}), '*'); } catch(e) {}
          });`;
    })
    .join('\n');

  const userMarker =
    userLat && userLng
      ? `L.circleMarker([${userLat}, ${userLng}], {radius: 8, fillColor: '#4A90D9', color: '#fff', weight: 3, fillOpacity: 1}).addTo(map).bindPopup('Vaša lokacija');`
      : '';

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  #map{width:100%;height:100%}
  .leaflet-control-attribution{display:none!important}
  .leaflet-control-zoom{display:none!important}
</style>
</head><body>
<div id="map"></div>
<script>
var map=L.map('map',{center:[${centerLat},${centerLng}],zoom:14,zoomControl:false,attributionControl:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
${markers}
${userMarker}
window.flyTo=function(lat,lng,z){map.flyTo([lat,lng],z||16)};
</script>
</body></html>`;
}

const LeafletMapWeb = forwardRef<LeafletMapRef, LeafletMapProps>((props, ref) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    const html = generateHTML(
      props.locations,
      props.markerColors,
      props.centerLat,
      props.centerLng,
      props.userLatitude,
      props.userLongitude
    );
    setHtmlContent(html);
  }, [props.locations, props.userLatitude, props.userLongitude]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'marker' && props.onMarkerPress) {
          props.onMarkerPress(data.id);
        }
      } catch (e) {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [props.onMarkerPress]);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom?: number) => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          (iframeRef.current.contentWindow as any).flyTo(lat, lng, zoom || 16);
        } catch (e) {}
      }
    },
  }));

  if (!htmlContent) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <iframe
        ref={iframeRef as any}
        srcDoc={htmlContent}
        style={{ width: '100%', height: '100%', border: 'none' } as any}
        sandbox="allow-scripts allow-same-origin"
      />
    </View>
  );
});

const LeafletMapNative = forwardRef<LeafletMapRef, LeafletMapProps>((props, ref) => {
  const webViewRef = useRef<any>(null);

  const html = generateHTML(
    props.locations,
    props.markerColors,
    props.centerLat,
    props.centerLng,
    props.userLatitude,
    props.userLongitude
  );

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom?: number) => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`flyTo(${lat},${lng},${zoom || 16}); true;`);
      }
    },
  }));

  // Dynamic import for WebView only on native
  const [WebView, setWebView] = useState<any>(null);
  useEffect(() => {
    const loadWebView = async () => {
      try {
        const mod = await import('react-native-webview');
        setWebView(() => mod.default || mod.WebView);
      } catch (e) {
        console.log('WebView not available');
      }
    };
    loadWebView();
  }, []);

  if (!WebView) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={{ flex: 1 }}
        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'marker' && props.onMarkerPress) {
              props.onMarkerPress(data.id);
            }
          } catch (e) {}
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
      />
    </View>
  );
});

const LeafletMap = forwardRef<LeafletMapRef, LeafletMapProps>((props, ref) => {
  if (Platform.OS === 'web') {
    return <LeafletMapWeb ref={ref} {...props} />;
  }
  return <LeafletMapNative ref={ref} {...props} />;
});

export default LeafletMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
