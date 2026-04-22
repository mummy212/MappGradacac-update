import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const PURPLE = '#7C3AED';
const FAV_KEY = 'gradacac_favorites';

interface Loc {
  id: string; name: string; category: string; address: string;
  latitude: number; longitude: number;
  avg_rating?: number; is_open?: boolean; images?: string[];
  distance?: number;
}

function calcDist(la1: number, lo1: number, la2: number, lo2: number) {
  const R = 6371000, p = Math.PI / 180;
  const a = 0.5 - Math.cos((la2 - la1) * p) / 2
    + Math.cos(la1 * p) * Math.cos(la2 * p) * (1 - Math.cos((lo2 - lo1) * p)) / 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}

function imgUri(img?: string) {
  return !img ? undefined : img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
}

export default function FavoritesTab({ userLoc }: {
  userLoc: { latitude: number; longitude: number } | null;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [favIds, setFavIds] = useState<string[]>([]);
  const [locs, setLocs] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavs = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(FAV_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setFavIds(ids);
      if (ids.length === 0) { setLocs([]); setLoading(false); return; }
      const allLocs: Loc[] = await fetch(`${BACKEND}/api/locations`).then(r => r.json());
      let filtered = allLocs.filter(l => ids.includes(l.id));
      if (userLoc) {
        filtered = filtered.map(l => ({
          ...l,
          distance: calcDist(userLoc.latitude, userLoc.longitude, l.latitude, l.longitude),
        }));
      }
      setLocs(filtered);
    } catch {}
    setLoading(false);
  }, [userLoc]);

  useEffect(() => { loadFavs(); }, [loadFavs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavs();
    setRefreshing(false);
  }, [loadFavs]);

  const removeFav = async (id: string) => {
    const next = favIds.filter(x => x !== id);
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
    setFavIds(next);
    setLocs(prev => prev.filter(l => l.id !== id));
  };

  return (
    <View style={[fv.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={fv.header}>
        <Text style={fv.headerTitle}>Omiljene lokacije</Text>
        <View style={fv.countBadge}>
          <Text style={fv.countTxt}>{locs.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={fv.loadWrap}>
          <ActivityIndicator color={PURPLE} size="large" />
        </View>
      ) : locs.length === 0 ? (
        <View style={fv.emptyWrap}>
          <View style={fv.emptyIcon}>
            <Ionicons name="heart-outline" size={52} color="#D1D5DB" />
          </View>
          <Text style={fv.emptyTitle}>Nema omiljenih</Text>
          <Text style={fv.emptyDesc}>
            Tapnite srce na detalju lokacije da biste je sačuvali ovdje
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
        >
          {locs.map(loc => (
            <TouchableOpacity key={loc.id} style={fv.card} onPress={() => router.push(`/location/${loc.id}`)}>
              <View style={fv.imgWrap}>
                {loc.images?.[0]
                  ? <Image source={{ uri: imgUri(loc.images[0]) }} style={fv.img} resizeMode="cover" />
                  : <View style={[fv.img, fv.imgPlaceholder]}>
                    <Ionicons name="storefront-outline" size={26} color="#9CA3AF" />
                  </View>}
                <View style={[fv.openBadge, { backgroundColor: loc.is_open !== false ? '#10B981' : '#EF4444' }]}>
                  <Text style={fv.openTxt}>{loc.is_open !== false ? 'Otv' : 'Zat'}</Text>
                </View>
              </View>
              <View style={fv.body}>
                <Text style={fv.name} numberOfLines={1}>{loc.name}</Text>
                <Text style={fv.addr} numberOfLines={1}>{loc.address}</Text>
                <View style={fv.meta}>
                  {(loc.avg_rating || 0) > 0 && (
                    <View style={fv.metaItem}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={fv.metaTxt}>{loc.avg_rating?.toFixed(1)}</Text>
                    </View>
                  )}
                  {loc.distance !== undefined && (
                    <View style={fv.metaItem}>
                      <Ionicons name="location-outline" size={12} color="#6B7280" />
                      <Text style={fv.metaTxt}>
                        {loc.distance < 1000 ? `${loc.distance}m` : `${(loc.distance / 1000).toFixed(1)}km`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={fv.removeBtn}
                onPress={() => removeFav(loc.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="heart" size={24} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const fv = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#111827' },
  countBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  countTxt: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: '#6B7280' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  emptyTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#374151' },
  emptyDesc: {
    fontSize: 14, fontFamily: 'Manrope_400Regular', color: '#9CA3AF',
    textAlign: 'center', marginTop: 8, lineHeight: 22,
  },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  imgWrap: { position: 'relative', width: 85, height: 85 },
  img: { width: 85, height: 85 },
  imgPlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  openBadge: {
    position: 'absolute', bottom: 4, left: 4, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
  },
  openTxt: { fontSize: 8, fontFamily: 'Manrope_700Bold', color: '#fff' },
  body: { flex: 1, padding: 12, justifyContent: 'center' },
  name: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#111827' },
  addr: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#6B7280', marginTop: 2 },
  meta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaTxt: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: '#6B7280' },
  removeBtn: { padding: 16, justifyContent: 'center', alignItems: 'center' },
});
