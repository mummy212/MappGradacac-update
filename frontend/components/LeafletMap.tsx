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
  onWebMessage?: (data: any) => void;
  markerColors: Record<string, string>;
  centerLat: number;
  centerLng: number;
}

export interface LeafletMapRef {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  startDownload: () => void;
  cancelDownload: () => void;
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
  #offline-badge{
    display:none;position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
    z-index:1000;color:#fff;padding:5px 14px;border-radius:20px;
    font-size:12px;font-family:sans-serif;font-weight:600;
    box-shadow:0 2px 10px rgba(0,0,0,0.25);white-space:nowrap;
    transition:opacity 0.3s;
  }
</style>
</head><body>
<div id="map"></div>
<div id="offline-badge"></div>
<script>
// ===== Tile Cache (IndexedDB) =====
var IDB_NAME='gmcache',IDB_STORE='tiles',IDB_TTL=7*24*3600*1000;
var _idb=null;
function openIDB(){
  return new Promise(function(res,rej){
    if(_idb)return res(_idb);
    var r=indexedDB.open(IDB_NAME,1);
    r.onupgradeneeded=function(e){e.target.result.createObjectStore(IDB_STORE,{keyPath:'u'});};
    r.onsuccess=function(e){_idb=e.target.result;res(_idb);};
    r.onerror=function(){rej('idb error');};
  });
}
function putTile(url,data){
  openIDB().then(function(db){
    var tx=db.transaction(IDB_STORE,'readwrite');
    try{tx.objectStore(IDB_STORE).put({u:url,d:data,t:Date.now()});}catch(e){}
  }).catch(function(){});
}
function getTile(url){
  return openIDB().then(function(db){
    return new Promise(function(res){
      var tx=db.transaction(IDB_STORE,'readonly');
      var req=tx.objectStore(IDB_STORE).get(url);
      req.onsuccess=function(){
        var r=req.result;
        if(r&&(Date.now()-r.t)<IDB_TTL)res(r.d);else res(null);
      };
      req.onerror=function(){res(null);};
    });
  }).catch(function(){return null;});
}
function countTiles(){
  return openIDB().then(function(db){
    return new Promise(function(res){
      var tx=db.transaction(IDB_STORE,'readonly');
      var req=tx.objectStore(IDB_STORE).count();
      req.onsuccess=function(){res(req.result||0);};
      req.onerror=function(){res(0);};
    });
  }).catch(function(){return 0;});
}
function pruneOldTiles(){
  openIDB().then(function(db){
    var cutoff=Date.now()-IDB_TTL;
    var tx=db.transaction(IDB_STORE,'readwrite');
    var store=tx.objectStore(IDB_STORE);
    var req=store.openCursor();
    req.onsuccess=function(e){
      var c=e.target.result;
      if(!c)return;
      if(c.value.t<cutoff)c.delete();
      c.continue();
    };
  }).catch(function(){});
}

// ===== Tile Download Engine =====
var _dl=false,_dlTotal=0,_dlDone=0;
function ll2tile(lat,lon,z){
  var n=Math.pow(2,z);
  var x=Math.floor((lon+180)/360*n);
  var r=lat*Math.PI/180;
  var y=Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n);
  return{x:x,y:y};
}
function calcTiles(latMin,latMax,lonMin,lonMax,zooms){
  var tiles=[];
  var subs=['a','b','c'];
  zooms.forEach(function(z){
    var mn=ll2tile(latMax,lonMin,z);
    var mx=ll2tile(latMin,lonMax,z);
    for(var x=mn.x;x<=mx.x;x++){
      for(var y=mn.y;y<=mx.y;y++){
        var s=subs[Math.abs(x+y)%3];
        tiles.push('https://'+s+'.tile.openstreetmap.org/'+z+'/'+x+'/'+y+'.png');
      }
    }
  });
  return tiles;
}
function sendMsg2(type,data){
  var m=Object.assign({type:type},data||{});
  try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m));}catch(e){}
  try{window.parent&&window.parent.postMessage(JSON.stringify(m),'*');}catch(e){}
}
async function runDownload(tiles){
  _dl=true;_dlTotal=tiles.length;_dlDone=0;
  sendMsg2('download_progress',{downloaded:0,total:_dlTotal});
  for(var i=0;i<tiles.length;i+=4){
    if(!_dl){sendMsg2('download_cancelled',{downloaded:_dlDone});return;}
    var batch=tiles.slice(i,Math.min(i+4,tiles.length));
    await Promise.all(batch.map(function(url){
      return getTile(url).then(function(cached){
        if(cached){_dlDone++;sendMsg2('download_progress',{downloaded:_dlDone,total:_dlTotal});return;}
        return new Promise(function(res){
          var xhr=new XMLHttpRequest();
          xhr.open('GET',url);xhr.responseType='blob';
          xhr.onload=function(){
            if(xhr.status>=200&&xhr.status<300){
              var fr=new FileReader();
              fr.onloadend=function(){putTile(url,fr.result);_dlDone++;sendMsg2('download_progress',{downloaded:_dlDone,total:_dlTotal});res();};
              fr.readAsDataURL(xhr.response);
            }else{_dlDone++;sendMsg2('download_progress',{downloaded:_dlDone,total:_dlTotal});res();}
          };
          xhr.onerror=function(){_dlDone++;sendMsg2('download_progress',{downloaded:_dlDone,total:_dlTotal});res();};
          xhr.send();
        });
      });
    }));
  }
  _dl=false;
  sendMsg2('download_complete',{count:_dlDone});
}
window.startOfflineDownload=function(){
  var tiles=calcTiles(44.83,44.93,18.38,18.48,[13,14,15,16]);
  runDownload(tiles);
};
window.cancelOfflineDownload=function(){_dl=false;};

var _badgeTimer=null;
function showBadge(msg,color,persist){
  var b=document.getElementById('offline-badge');
  if(!b)return;
  b.textContent=msg;
  b.style.backgroundColor=color;
  b.style.display='block';
  b.style.opacity='1';
  if(_badgeTimer)clearTimeout(_badgeTimer);
  if(!persist){
    _badgeTimer=setTimeout(function(){
      b.style.opacity='0';
      setTimeout(function(){b.style.display='none';},300);
    },2500);
  }
}

// ===== Custom Cached Tile Layer =====
var CachedTileLayer=L.TileLayer.extend({
  createTile:function(coords,done){
    var tile=document.createElement('img');
    tile.alt='';
    var url=this.getTileUrl(coords);
    getTile(url).then(function(cached){
      if(cached){
        tile.src=cached;
        done(null,tile);
      } else {
        var xhr=new XMLHttpRequest();
        xhr.open('GET',url);
        xhr.responseType='blob';
        xhr.onload=function(){
          if(xhr.status>=200&&xhr.status<300){
            var reader=new FileReader();
            reader.onloadend=function(){
              putTile(url,reader.result);
              tile.src=reader.result;
              done(null,tile);
            };
            reader.readAsDataURL(xhr.response);
          } else {
            tile.src=url;done(null,tile);
          }
        };
        xhr.onerror=function(){
          showBadge('📴 Offline način rada','#EF4444',true);
          done(new Error('offline'),tile);
        };
        xhr.send();
      }
    }).catch(function(){
      tile.src=url;done(null,tile);
    });
    return tile;
  }
});

// ===== Init Map =====
var map=L.map('map',{center:[${centerLat},${centerLng}],zoom:14,zoomControl:false,attributionControl:false});
new CachedTileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
${markers}
${userMarker}
window.flyTo=function(lat,lng,z){map.flyTo([lat,lng],z||16)};

// Show cache size on load
countTiles().then(function(n){
  if(n>100)showBadge('💾 '+n+' tile-a u offline cache-u','#7C3AED',false);
});

// Prune old tiles on init
pruneOldTiles();

// Network status listeners
window.addEventListener('online',function(){
  showBadge('✅ Internet vraćen','#10B981',false);
});
window.addEventListener('offline',function(){
  showBadge('📴 Offline način – koristim cache','#EF4444',true);
});
</script>
</body></html>`;
}

const LeafletMapWeb = forwardRef<LeafletMapRef, LeafletMapProps>((props, ref) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    const html = generateHTML(
      props.locations, props.markerColors,
      props.centerLat, props.centerLng,
      props.userLatitude, props.userLongitude
    );
    setHtmlContent(html);
  }, [props.locations, props.userLatitude, props.userLongitude]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'marker' && props.onMarkerPress) props.onMarkerPress(data.id);
        else if (props.onWebMessage) props.onWebMessage(data);
      } catch (e) {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [props.onMarkerPress, props.onWebMessage]);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom?: number) => {
      if (iframeRef.current?.contentWindow) {
        try { (iframeRef.current.contentWindow as any).flyTo(lat, lng, zoom || 16); } catch (e) {}
      }
    },
    startDownload: () => {
      if (iframeRef.current?.contentWindow) {
        try { (iframeRef.current.contentWindow as any).startOfflineDownload(); } catch (e) {}
      }
    },
    cancelDownload: () => {
      if (iframeRef.current?.contentWindow) {
        try { (iframeRef.current.contentWindow as any).cancelOfflineDownload(); } catch (e) {}
      }
    },
  }));

  if (!htmlContent) return <View style={styles.container} />;
  return (
    <View style={styles.container}>
      <iframe ref={iframeRef as any} srcDoc={htmlContent}
        style={{ width: '100%', height: '100%', border: 'none' } as any}
        sandbox="allow-scripts allow-same-origin" />
    </View>
  );
});

const LeafletMapNative = forwardRef<LeafletMapRef, LeafletMapProps>((props, ref) => {
  const webViewRef = useRef<any>(null);
  const html = generateHTML(
    props.locations, props.markerColors,
    props.centerLat, props.centerLng,
    props.userLatitude, props.userLongitude
  );

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom?: number) => {
      webViewRef.current?.injectJavaScript(`flyTo(${lat},${lng},${zoom || 16}); true;`);
    },
    startDownload: () => {
      webViewRef.current?.injectJavaScript(`startOfflineDownload(); true;`);
    },
    cancelDownload: () => {
      webViewRef.current?.injectJavaScript(`cancelOfflineDownload(); true;`);
    },
  }));

  const [WebView, setWebView] = useState<any>(null);
  useEffect(() => {
    import('react-native-webview').then(mod => setWebView(() => mod.default || mod.WebView)).catch(() => {});
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
            if (data.type === 'marker' && props.onMarkerPress) props.onMarkerPress(data.id);
            else if (props.onWebMessage) props.onWebMessage(data);
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
