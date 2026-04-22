import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import LeafletMap, { LeafletMapRef } from './LeafletMap';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const LAT = 44.8797, LNG = 18.4275;
const PURPLE = '#7C3AED';

interface Cat { id: string; name: string; icon: string; color: string; }
interface Loc {
  id: string; name: string; category: string; latitude: number;
  longitude: number; address: string; is_open?: boolean;
}

export default function MapTab({
  userLoc, filterCategory, onCategoryChange,
}: {
  userLoc: { latitude: number; longitude: number } | null;
  filterCategory: string;
  onCategoryChange: (cat: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<LeafletMapRef>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [locs, setLocs] = useState<Loc[]>([]);
  const [selectedCat, setSelectedCat] = useState(filterCategory);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { setSelectedCat(filterCategory); }, [filterCategory]);

  const fetchData = useCallback(async () => {
    try {
      const [cl, ll] = await Promise.all([
        fetch(`${BACKEND}/api/categories`).then(r => r.json()),
        fetch(`${BACKEND}/api/locations`).then(r => r.json()),
      ]);
      setCats(Array.isArray(cl) ? cl : []);
      setLocs(Array.isArray(ll) ? ll : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCatSelect = (catId: string) => {
    const next = selectedCat === catId ? '' : catId;
    setSelectedCat(next);
    onCategoryChange(next);
  };

  const filteredLocs = locs.filter(l => {
    if (selectedCat && l.category !== selectedCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q);
    }
    return true;
  });

  const markerColors = Object.fromEntries(cats.map(c => [c.id, c.color]));

  return (
    <View style={ms.root}>
      {loading && (
        <View style={ms.loader}>
          <ActivityIndicator color={PURPLE} size="large" />
        </View>
      )}

      <LeafletMap
        ref={mapRef}
        locations={filteredLocs}
        markerColors={markerColors}
        centerLat={LAT}
        centerLng={LNG}
        userLatitude={userLoc?.latitude}
        userLongitude={userLoc?.longitude}
        onMarkerPress={(id) => router.push(`/location/${id}`)}
      />

      {/* Top overlay: search + category pills */}
      <View style={[ms.topOverlay, { top: insets.top + 8 }]}>
        <View style={ms.searchBar}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={ms.searchInput}
            placeholder="Pretraži lokacije..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {cats.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ms.pillsRow}
            style={ms.pillsScroll}
          >
            <TouchableOpacity
              style={[ms.pill, !selectedCat && ms.pillActive]}
              onPress={() => handleCatSelect('')}
            >
              <Text style={[ms.pillTxt, !selectedCat && ms.pillTxtActive]}>Sve</Text>
            </TouchableOpacity>
            {cats.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[ms.pill, selectedCat === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => handleCatSelect(cat.id)}
              >
                <Ionicons
                  name={((cat.icon || 'location') + '-outline') as any}
                  size={13}
                  color={selectedCat === cat.id ? '#fff' : '#6B7280'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[ms.pillTxt, selectedCat === cat.id && ms.pillTxtActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Floating controls */}
      <View style={[ms.controls, { bottom: 24 }]}>
        <TouchableOpacity
          style={ms.ctrlBtn}
          onPress={() => { if (userLoc) mapRef.current?.flyTo(userLoc.latitude, userLoc.longitude, 16); }}
        >
          <Ionicons name="locate" size={22} color={PURPLE} />
        </TouchableOpacity>
        <TouchableOpacity style={[ms.ctrlBtn, { backgroundColor: PURPLE }]} onPress={() => router.push('/qr')}>
          <Ionicons name="qr-code-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Location count pill */}
      {!loading && (
        <View style={[ms.countPill, { bottom: 24, left: 14 }]}>
          <Text style={ms.countTxt}>{filteredLocs.length} lokacija</Text>
        </View>
      )}
    </View>
  );
}

const ms = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 99,
  },
  topOverlay: { position: 'absolute', left: 12, right: 12, zIndex: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 8,
    ...Platform.select({
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.12)' } as any,
      default: {
        elevation: 4, shadowColor: '#000', shadowOpacity: 0.12,
        shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: 'Manrope_500Medium', color: '#111827', padding: 0,
  },
  pillsScroll: { marginTop: 8 },
  pillsRow: { paddingHorizontal: 2, gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } as any,
      default: { elevation: 2 },
    }),
  },
  pillActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  pillTxt: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: '#6B7280' },
  pillTxtActive: { color: '#fff' },
  controls: { position: 'absolute', right: 14, gap: 10 },
  ctrlBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } as any,
      default: { elevation: 4 },
    }),
  },
  countPill: {
    position: 'absolute', backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  countTxt: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: '#6B7280' },
});
