import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  Dimensions, Platform, Alert, TextInput, Keyboard, StatusBar, Image,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFonts, Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium } from '@expo-google-fonts/outfit';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import axios from 'axios';
import LeafletMap, { LeafletMapRef } from '../components/LeafletMap';

const { width, height } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const LAT = 44.8797, LNG = 18.4275;

const C = {
  bg: '#FAF9F6', surface: '#FFF', primary: '#4A5D4E', primaryFg: '#FFF',
  accent: '#D97757', accentFg: '#FFF', text: '#1C1C1C', textSec: '#6B6B6B',
  border: '#E5E4E2', star: '#F59E0B', open: '#27AE60', closed: '#E74C3C',
};

const MARKER_COLORS: Record<string, string> = {
  restaurant: '#FF6B6B', market: '#4ECDC4', auto_service: '#45B7D1',
  cafe: '#96CEB4', pharmacy: '#FFEAA7', gas_station: '#DDA0DD',
};

interface Cat { id: string; name: string; icon: string; color: string; }
interface Loc {
  id: string; name: string; category: string; address: string;
  latitude: number; longitude: number; phone?: string; description?: string;
  working_hours?: string; avg_rating?: number; review_count?: number;
  is_open?: boolean; distance?: number; images?: string[]; is_premium?: boolean;
}
interface OfferItem { id: string; location_id: string; title: string; description: string; discount_percent?: number; location_name?: string; location_image?: string; }
interface EventItem { id: string; title: string; description: string; location_name: string; date: string; time?: string; }

export default function Index() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<LeafletMapRef>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [locs, setLocs] = useState<Loc[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [userLoc, setUserLoc] = useState<{latitude:number;longitude:number}|null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string|null>(null);
  const [showCatList, setShowCatList] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  const [fontsLoaded] = useFonts({ Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });

  useEffect(() => { init(); }, []);

  const init = async () => {
    await getGPS();
    await Promise.all([fetchCats(), fetchLocs(), fetchOffers(), fetchEvents(), loadFavorites()]);
    setLoading(false);
  };

  const getGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const l = await Location.getCurrentPositionAsync({});
        setUserLoc({ latitude: l.coords.latitude, longitude: l.coords.longitude });
      }
    } catch {}
  };

  const fetchCats = async () => { try { setCats((await axios.get(`${BACKEND}/api/categories`)).data); } catch {} };
  const fetchLocs = async () => { try { setLocs((await axios.get(`${BACKEND}/api/locations`)).data); } catch {} };
  const fetchOffers = async () => { try { setOffers((await axios.get(`${BACKEND}/api/offers`)).data); } catch {} };
  const fetchEvents = async () => { try { setEvents((await axios.get(`${BACKEND}/api/events`)).data); } catch {} };

  const loadFavorites = async () => {
    try {
      if (Platform.OS === 'web') { const f = window.localStorage.getItem('favorites'); if (f) setFavorites(JSON.parse(f)); }
    } catch {}
  };

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { if (Platform.OS === 'web') window.localStorage.setItem('favorites', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const filteredLocs = useCallback(() => {
    let result = locs;
    if (selectedCat) result = result.filter(l => l.category === selectedCat);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q));
    }
    // Sort by distance if available
    if (userLoc) {
      result = result.map(l => {
        const R = 6371000, p = Math.PI / 180;
        const a = 0.5 - Math.cos((l.latitude - userLoc.latitude) * p) / 2 + Math.cos(userLoc.latitude * p) * Math.cos(l.latitude * p) * (1 - Math.cos((l.longitude - userLoc.longitude) * p)) / 2;
        return { ...l, distance: Math.round(R * 2 * Math.asin(Math.sqrt(a))) };
      });
      result.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    return result;
  }, [locs, selectedCat, search, userLoc]);

  const getCatColor = (id: string) => cats.find(c => c.id === id)?.color || MARKER_COLORS[id] || '#888';

  if (loading || !fontsLoaded) return (
    <View testID="loading-screen" style={s.loadWrap}>
      <StatusBar barStyle="dark-content" />
      <View style={s.loadIcon}><Ionicons name="map" size={48} color={C.primary} /></View>
      <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 20 }} />
      <Text style={s.loadText}>Gradačac Mapa</Text>
    </View>
  );

  // ====== CATEGORY LIST VIEW ======
  if (showCatList) {
    const fl = filteredLocs();
    return (
      <View testID="category-list-screen" style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        {/* Header */}
        <View style={s.catListHeader}>
          <TouchableOpacity testID="back-cat-btn" style={s.backCircle} onPress={() => { setShowCatList(false); setSelectedCat(null); setSearch(''); }}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={s.catListTitle}>{selectedCat ? cats.find(c=>c.id===selectedCat)?.name || '' : 'Sve lokacije'}</Text>
          <Text style={s.catListCount}>{fl.length}</Text>
        </View>
        {/* Search */}
        <View style={s.catSearchWrap}>
          <Ionicons name="search" size={18} color={C.textSec} />
          <TextInput testID="cat-search" style={s.catSearchInput} placeholder="Pretraži..." placeholderTextColor={C.textSec}
            value={search} onChangeText={setSearch} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={C.textSec} /></TouchableOpacity>}
        </View>
        {/* List */}
        <ScrollView style={s.catListScroll} showsVerticalScrollIndicator={false}>
          {fl.map(loc => (
            <TouchableOpacity key={loc.id} testID={`loc-${loc.id}`} style={s.locCard} onPress={() => router.push(`/location/${loc.id}`)}>
              {loc.images && loc.images.length > 0 ? (
                <Image source={{ uri: loc.images[0] }} style={s.locThumb} />
              ) : (
                <View style={[s.locThumbPlaceholder, { backgroundColor: getCatColor(loc.category) + '20' }]}>
                  <Ionicons name="image-outline" size={20} color={getCatColor(loc.category)} />
                </View>
              )}
              <View style={s.locBody}>
                <View style={s.locTopRow}>
                  <Text style={s.locName} numberOfLines={1}>{loc.name}</Text>
                  <TouchableOpacity onPress={() => toggleFav(loc.id)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                    <Ionicons name={favorites.includes(loc.id) ? 'heart' : 'heart-outline'} size={18} color={favorites.includes(loc.id) ? C.accent : C.textSec} />
                  </TouchableOpacity>
                </View>
                <Text style={s.locAddr} numberOfLines={1}>{loc.address}</Text>
                <View style={s.locMeta}>
                  <View style={[s.openBadge, { backgroundColor: loc.is_open ? C.open + '15' : C.closed + '15' }]}>
                    <View style={[s.openDot, { backgroundColor: loc.is_open ? C.open : C.closed }]} />
                    <Text style={[s.openText, { color: loc.is_open ? C.open : C.closed }]}>{loc.is_open ? 'Otvoreno' : 'Zatvoreno'}</Text>
                  </View>
                  {(loc.avg_rating || 0) > 0 && (
                    <View style={s.ratingSmall}><Ionicons name="star" size={12} color={C.star} /><Text style={s.ratingSmallTxt}>{loc.avg_rating?.toFixed(1)}</Text></View>
                  )}
                  {loc.distance !== undefined && <Text style={s.distTxt}>{loc.distance < 1000 ? `${loc.distance}m` : `${(loc.distance/1000).toFixed(1)}km`}</Text>}
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ====== MAIN HOME VIEW ======
  return (
    <View testID="main-screen" style={s.root}>
      <StatusBar barStyle="dark-content" />

      {/* MAP */}
      <View style={s.mapWrap}>
        <LeafletMap ref={mapRef} locations={locs} markerColors={Object.fromEntries(cats.map(c=>[c.id, c.color]))}
          centerLat={LAT} centerLng={LNG} userLatitude={userLoc?.latitude} userLongitude={userLoc?.longitude}
          onMarkerPress={(id) => router.push(`/location/${id}`)} />
        {/* Search */}
        <View style={[s.searchWrap, { top: insets.top + 10 }]}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={18} color={C.textSec} />
            <TextInput testID="search-input" style={s.searchInput} placeholder="Pretraži Gradačac..."
              placeholderTextColor={C.textSec} value={search} onChangeText={v => { setSearch(v); if (v.length > 0) setShowCatList(true); }}
              onFocus={() => setShowCatList(true)} returnKeyType="search" />
          </View>
        </View>
        {/* Map controls */}
        <View style={s.mapCtrl}>
          <TouchableOpacity testID="about-btn" style={[s.mapBtn, { backgroundColor: C.accent }]}
            onPress={() => router.push('/about')}><Ionicons name="heart-outline" size={20} color="#fff" /></TouchableOpacity>
          <TouchableOpacity testID="admin-btn" style={[s.mapBtn, { backgroundColor: C.primary }]}
            onPress={() => router.push('/admin')}><Ionicons name="settings-outline" size={20} color="#fff" /></TouchableOpacity>
          <TouchableOpacity testID="locate-btn" style={s.mapBtn}
            onPress={() => { if (userLoc) mapRef.current?.flyTo(userLoc.latitude, userLoc.longitude, 16); }}><Ionicons name="locate" size={20} color={C.primary} /></TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      <View style={s.content}>
        <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
          {/* Featured Offers */}
          {offers.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Posebne ponude</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20 }}>
                {offers.map(o => (
                  <TouchableOpacity key={o.id} testID={`offer-${o.id}`} style={s.offerCard}
                    onPress={() => router.push(`/location/${o.location_id}`)}>
                    {o.discount_percent && <View style={s.discountBadge}><Text style={s.discountTxt}>-{o.discount_percent}%</Text></View>}
                    <Text style={s.offerTitle} numberOfLines={1}>{o.title}</Text>
                    <Text style={s.offerDesc} numberOfLines={2}>{o.description}</Text>
                    <Text style={s.offerLoc}>{o.location_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Categories Grid */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Kategorije</Text>
            <View style={s.catGrid}>
              {cats.map(cat => (
                <TouchableOpacity key={cat.id} testID={`cat-grid-${cat.id}`} style={s.catGridItem}
                  onPress={() => { setSelectedCat(cat.id); setShowCatList(true); }}>
                  <View style={[s.catGridIcon, { backgroundColor: cat.color + '18' }]}>
                    <Ionicons name={(cat.icon + '-outline') as any} size={26} color={cat.color} />
                  </View>
                  <Text style={s.catGridName} numberOfLines={1}>{cat.name}</Text>
                  <Text style={s.catGridCount}>{locs.filter(l => l.category === cat.id).length}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Events */}
          {events.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Nadolazeći događaji</Text>
              {events.slice(0, 3).map(e => (
                <View key={e.id} testID={`event-${e.id}`} style={s.eventCard}>
                  <View style={s.eventDate}>
                    <Text style={s.eventDay}>{e.date.split('-')[2]}</Text>
                    <Text style={s.eventMonth}>{['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'][parseInt(e.date.split('-')[1])-1]}</Text>
                  </View>
                  <View style={s.eventBody}>
                    <Text style={s.eventTitle}>{e.title}</Text>
                    <Text style={s.eventDesc} numberOfLines={1}>{e.description}</Text>
                    <View style={s.eventMeta}>
                      <Ionicons name="location-outline" size={12} color={C.textSec} />
                      <Text style={s.eventMetaTxt}>{e.location_name}</Text>
                      {e.time && <><Ionicons name="time-outline" size={12} color={C.textSec} style={{marginLeft:8}} /><Text style={s.eventMetaTxt}>{e.time}</Text></>}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Favorites */}
          {favorites.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Omiljeno</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20 }}>
                {locs.filter(l => favorites.includes(l.id)).map(loc => (
                  <TouchableOpacity key={loc.id} style={s.favCard} onPress={() => router.push(`/location/${loc.id}`)}>
                    <Text style={s.favName} numberOfLines={1}>{loc.name}</Text>
                    <View style={[s.openBadge, { backgroundColor: loc.is_open ? C.open + '15' : C.closed + '15' }]}>
                      <View style={[s.openDot, { backgroundColor: loc.is_open ? C.open : C.closed }]} />
                      <Text style={[s.openText, { color: loc.is_open ? C.open : C.closed }]}>{loc.is_open ? 'Otvoreno' : 'Zatvoreno'}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Browse all */}
          <TouchableOpacity testID="browse-all-btn" style={s.browseBtn} onPress={() => { setSelectedCat(null); setShowCatList(true); }}>
            <Ionicons name="list" size={20} color={C.primary} />
            <Text style={s.browseTxt}>Pogledaj sve lokacije ({locs.length})</Text>
            <Ionicons name="chevron-forward" size={18} color={C.textSec} />
          </TouchableOpacity>
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  loadText: { marginTop: 16, fontSize: 20, fontFamily: 'Outfit_700Bold', color: C.text },
  // Map
  mapWrap: { height: height * 0.38, position: 'relative' },
  searchWrap: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 50, paddingHorizontal: 18, paddingVertical: Platform.OS === 'ios' ? 12 : 8, borderWidth: 1, borderColor: C.border, ...Platform.select({ web: { boxShadow: '0 4px 16px rgba(0,0,0,0.06)' } as any, default: { elevation: 6 } }) },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Manrope_500Medium', color: C.text, marginLeft: 10, padding: 0 },
  mapCtrl: { position: 'absolute', right: 12, bottom: 24 },
  mapBtn: { backgroundColor: C.surface, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: C.border },
  // Content
  content: { flex: 1, backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -16, paddingTop: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: C.text, paddingHorizontal: 20, marginBottom: 12 },
  // Offers
  offerCard: { width: 200, backgroundColor: C.accent + '0C', borderRadius: 16, padding: 16, marginRight: 12, borderWidth: 1, borderColor: C.accent + '20' },
  discountBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  discountTxt: { color: '#fff', fontSize: 12, fontFamily: 'Manrope_700Bold' },
  offerTitle: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: C.text, marginBottom: 4, paddingRight: 40 },
  offerDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: C.textSec, lineHeight: 18, marginBottom: 8 },
  offerLoc: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: C.accent },
  // Categories grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  catGridItem: { width: (width - 52) / 3, backgroundColor: C.surface, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  catGridIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  catGridName: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: C.text, textAlign: 'center' },
  catGridCount: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: C.textSec, marginTop: 2 },
  // Events
  eventCard: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 10, backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  eventDate: { width: 50, height: 50, borderRadius: 14, backgroundColor: C.accent + '10', justifyContent: 'center', alignItems: 'center' },
  eventDay: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: C.accent },
  eventMonth: { fontSize: 10, fontFamily: 'Manrope_600SemiBold', color: C.accent },
  eventBody: { flex: 1, marginLeft: 14 },
  eventTitle: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: C.text },
  eventDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: C.textSec, marginTop: 2 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  eventMetaTxt: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: C.textSec, marginLeft: 3 },
  // Favorites
  favCard: { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginRight: 10, borderWidth: 1, borderColor: C.border, minWidth: 140 },
  favName: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: C.text, marginBottom: 6 },
  // Browse all
  browseBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, padding: 16, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  browseTxt: { flex: 1, fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: C.text, marginLeft: 12 },
  // Open/closed badge
  openBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  openDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  openText: { fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
  // Category list view
  catListHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border, marginRight: 12 },
  catListTitle: { flex: 1, fontSize: 20, fontFamily: 'Outfit_700Bold', color: C.text },
  catListCount: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: C.textSec, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: C.border },
  catSearchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 10, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  catSearchInput: { flex: 1, fontSize: 14, fontFamily: 'Manrope_500Medium', color: C.text, marginLeft: 8, padding: 0 },
  catListScroll: { flex: 1, paddingHorizontal: 20 },
  // Location cards (list view)
  locCard: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  locThumb: { width: 60, height: 60, borderRadius: 12 },
  locThumbPlaceholder: { width: 60, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  locBody: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  locTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locName: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: C.text, flex: 1, marginRight: 8 },
  locAddr: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: C.textSec, marginTop: 2 },
  locMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  ratingSmall: { flexDirection: 'row', alignItems: 'center' },
  ratingSmallTxt: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: C.star, marginLeft: 3 },
  distTxt: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: C.primary },
});
