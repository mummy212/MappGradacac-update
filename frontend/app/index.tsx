import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  TextInput,
  Keyboard,
  StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium } from '@expo-google-fonts/outfit';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { useRouter } from 'expo-router';
import axios from 'axios';
import LeafletMap, { LeafletMapRef } from '../components/LeafletMap';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const GRADACAC_LAT = 44.8797;
const GRADACAC_LNG = 18.4275;

const colors = {
  background: '#FAF9F6',
  surface: '#FFFFFF',
  primary: '#4A5D4E',
  primaryFg: '#FFFFFF',
  accent: '#D97757',
  accentFg: '#FFFFFF',
  textPrimary: '#1C1C1C',
  textSecondary: '#6B6B6B',
  border: '#E5E4E2',
  overlay: 'rgba(28,28,28,0.4)',
};

const MARKER_COLORS: Record<string, string> = {
  restaurant: '#FF6B6B',
  market: '#4ECDC4',
  auto_service: '#45B7D1',
  cafe: '#96CEB4',
  pharmacy: '#FFEAA7',
  gas_station: '#DDA0DD',
};

const CAT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  restaurant: 'restaurant-outline',
  market: 'cart-outline',
  auto_service: 'car-outline',
  cafe: 'cafe-outline',
  pharmacy: 'medkit-outline',
  gas_station: 'water-outline',
};

const CAT_ICONS_FILLED: Record<string, keyof typeof Ionicons.glyphMap> = {
  restaurant: 'restaurant',
  market: 'cart',
  auto_service: 'car',
  cafe: 'cafe',
  pharmacy: 'medkit',
  gas_station: 'water',
};

interface Category { id: string; name: string; icon: string; color: string; }
interface LocationItem {
  id: string; name: string; category: string; address: string;
  latitude: number; longitude: number; phone?: string;
  description?: string; working_hours?: string; avg_rating?: number;
  review_count?: number; service_tags?: string[]; price_level?: number;
}

export default function Index() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<LeafletMapRef>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [allLocations, setAllLocations] = useState<LocationItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [fontsLoaded] = useFonts({
    Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
  });

  useEffect(() => { initializeApp(); }, []);

  const initializeApp = async () => {
    await requestLocationPermission();
    await fetchCategories();
    await fetchAllLocations();
    setLoading(false);
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    } catch (e) { console.log('Location error:', e); }
  };

  const fetchCategories = async () => {
    try {
      const r = await axios.get(`${BACKEND_URL}/api/categories`);
      setCategories(r.data);
    } catch (e) { console.error('Categories error:', e); }
  };

  const fetchAllLocations = async () => {
    try {
      const r = await axios.get(`${BACKEND_URL}/api/locations`);
      setAllLocations(r.data);
      setLocations(r.data);
    } catch (e) { console.error('Locations error:', e); }
  };

  const handleCategorySelect = useCallback((catId: string) => {
    if (selectedCategory === catId) {
      setSelectedCategory(null);
      setLocations(allLocations);
    } else {
      setSelectedCategory(catId);
      setLocations(allLocations.filter(l => l.category === catId));
    }
    setSearchQuery('');
  }, [selectedCategory, allLocations]);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (!text) {
      setLocations(selectedCategory ? allLocations.filter(l => l.category === selectedCategory) : allLocations);
      return;
    }
    const q = text.toLowerCase();
    setLocations(allLocations.filter(l =>
      l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)
    ));
  }, [allLocations, selectedCategory]);

  const handleMarkerPress = useCallback((locationId: string) => {
    router.push(`/location/${locationId}`);
  }, []);

  const handleCardPress = (location: LocationItem) => {
    router.push(`/location/${location.id}`);
  };

  const centerOnUser = () => {
    if (userLocation) mapRef.current?.flyTo(userLocation.latitude, userLocation.longitude, 16);
    else Alert.alert('Lokacija', 'GPS nije dostupan');
  };

  const centerOnCity = () => mapRef.current?.flyTo(GRADACAC_LAT, GRADACAC_LNG, 14);
  const getCatName = (id: string) => categories.find(c => c.id === id)?.name || id;

  if (loading || !fontsLoaded) {
    return (
      <View testID="loading-screen" style={s.loadWrap}>
        <StatusBar barStyle="dark-content" />
        <View style={s.loadIcon}><Ionicons name="map" size={48} color={colors.primary} /></View>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 20 }} />
        <Text style={s.loadText}>Učitavanje mape...</Text>
        <Text style={s.loadSub}>Gradačac, BiH</Text>
      </View>
    );
  }

  return (
    <View testID="main-screen" style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* MAP */}
      <View style={s.mapWrap}>
        <LeafletMap
          ref={mapRef}
          locations={locations}
          markerColors={MARKER_COLORS}
          centerLat={GRADACAC_LAT}
          centerLng={GRADACAC_LNG}
          userLatitude={userLocation?.latitude}
          userLongitude={userLocation?.longitude}
          onMarkerPress={handleMarkerPress}
        />

        {/* Search */}
        <View style={[s.searchWrap, { top: insets.top + 12 }]}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              testID="search-input"
              style={s.searchInput}
              placeholder="Pretraži lokacije..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity testID="clear-search-btn" onPress={() => handleSearch('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories */}
        <View style={s.catOverlay}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
            {categories.map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity key={cat.id} testID={`category-${cat.id}`}
                  style={[s.catChip, active && s.catChipActive]}
                  onPress={() => handleCategorySelect(cat.id)} activeOpacity={0.7}>
                  <Ionicons name={active ? CAT_ICONS_FILLED[cat.id] : CAT_ICONS[cat.id]}
                    size={16} color={active ? colors.primaryFg : colors.textPrimary} />
                  <Text style={[s.catText, active && s.catTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Controls */}
        <View style={s.mapCtrl}>
          <TouchableOpacity testID="about-btn" style={[s.mapBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/about')} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity testID="admin-panel-btn" style={[s.mapBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/admin')} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity testID="center-user-btn" style={s.mapBtn} onPress={centerOnUser} activeOpacity={0.7}>
            <Ionicons name="locate" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity testID="center-city-btn" style={s.mapBtn} onPress={centerOnCity} activeOpacity={0.7}>
            <Ionicons name="home-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* BOTTOM SHEET */}
      <View style={s.sheet}>
        <View style={s.dragHandle} />
        <View style={s.listHead}>
          <Text testID="location-count" style={s.listTitle}>
            {selectedCategory ? getCatName(selectedCategory) : 'Sve lokacije'}
          </Text>
          <View style={s.badge}><Text style={s.badgeText}>{locations.length}</Text></View>
        </View>

        <ScrollView testID="location-list" showsVerticalScrollIndicator={false}
          style={s.listScroll} keyboardShouldPersistTaps="handled">
          {locations.length === 0 ? (
            <View testID="no-results" style={s.empty}>
              <Ionicons name="search-outline" size={48} color={colors.border} />
              <Text style={s.emptyText}>Nema rezultata</Text>
              <Text style={s.emptySub}>Pokušajte sa drugačijim pojmom</Text>
            </View>
          ) : (
            locations.map(loc => (
              <TouchableOpacity key={loc.id} testID={`location-card-${loc.id}`}
                style={s.card} onPress={() => handleCardPress(loc)} activeOpacity={0.7}>
                <View style={[s.cardIcon, { borderColor: MARKER_COLORS[loc.category] || colors.border }]}>
                  <Ionicons name={CAT_ICONS_FILLED[loc.category] || 'location'}
                    size={22} color={MARKER_COLORS[loc.category] || colors.accent} />
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={1}>{loc.name}</Text>
                  <Text style={s.cardAddr} numberOfLines={1}>{loc.address}</Text>
                  <View style={s.cardBottom}>
                    {loc.working_hours && (
                      <View style={s.cardHours}>
                        <Ionicons name="time-outline" size={12} color={colors.primary} />
                        <Text style={s.cardHoursText}>{loc.working_hours}</Text>
                      </View>
                    )}
                    {(loc.avg_rating || 0) > 0 && (
                      <View style={s.cardRating}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={s.cardRatingText}>{loc.avg_rating?.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.border} style={{ padding: 8 }} />
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Loading
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  loadText: { marginTop: 16, fontSize: 18, fontFamily: 'Outfit_600SemiBold', color: colors.textPrimary },
  loadSub: { marginTop: 4, fontSize: 14, fontFamily: 'Manrope_400Regular', color: colors.textSecondary },
  // Map
  mapWrap: { height: height * 0.48, position: 'relative' },
  // Search
  searchWrap: { position: 'absolute', left: 20, right: 20, zIndex: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 50, paddingHorizontal: 20, paddingVertical: Platform.OS === 'ios' ? 14 : 10, borderWidth: 1, borderColor: colors.border, ...Platform.select({ web: { boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 8 } }) },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, marginLeft: 12, padding: 0 },
  // Categories
  catOverlay: { position: 'absolute', left: 0, right: 0, zIndex: 5, ...Platform.select({ ios: { top: 110 }, android: { top: 90 }, default: { top: 60 } }) },
  catScroll: { paddingHorizontal: 20, paddingVertical: 4 },
  catChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, borderWidth: 1, borderColor: colors.border, ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3 } }) },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { marginLeft: 6, fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: colors.textPrimary },
  catTextActive: { color: colors.primaryFg },
  // Map controls
  mapCtrl: { position: 'absolute', right: 16, bottom: 30 },
  mapBtn: { backgroundColor: colors.surface, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.border, ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 } }) },
  // Bottom sheet
  sheet: { flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20, paddingTop: 12, ...Platform.select({ web: { boxShadow: '0 -8px 24px rgba(0,0,0,0.04)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 10 } }) },
  dragHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 12 },
  listTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, letterSpacing: -0.5 },
  badge: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: colors.textSecondary },
  listScroll: { flex: 1, paddingHorizontal: 20 },
  // Cards
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  cardBody: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: colors.textPrimary, letterSpacing: -0.3 },
  cardAddr: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, marginTop: 2 },
  cardHours: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardHoursText: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: colors.primary, marginLeft: 4 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10 },
  cardRating: { flexDirection: 'row', alignItems: 'center' },
  cardRatingText: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: '#F59E0B', marginLeft: 3 },
  // Empty
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 17, fontFamily: 'Outfit_600SemiBold', color: colors.textSecondary, marginTop: 12 },
  emptySub: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: colors.border, marginTop: 4 },
  // Modal
  modalOuter: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  modalBox: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: height * 0.65 },
  modalDrag: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalLargeIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 26, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, letterSpacing: -0.8, marginBottom: 8 },
  catBadge: { backgroundColor: colors.background, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  catBadgeText: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInfo: { marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  infoText: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: colors.textPrimary, marginLeft: 14, flex: 1, lineHeight: 22 },
  modalActions: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16 },
  btnPrimaryText: { color: colors.accentFg, fontSize: 15, fontFamily: 'Manrope_700Bold', marginLeft: 8 },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: colors.border },
  btnSecondaryText: { color: colors.textPrimary, fontSize: 15, fontFamily: 'Manrope_700Bold', marginLeft: 8 },
});
