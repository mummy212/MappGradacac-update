import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, Dimensions, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts, Outfit_700Bold, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import LeafletMap from '../../components/LeafletMap';
import axios from 'axios';

const { width } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const C = { bg: '#FAF9F6', surface: '#FFF', primary: '#4A5D4E', accent: '#D97757', text: '#1C1C1C', textSec: '#6B6B6B', border: '#E5E4E2' };

const CAT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = { Historija: 'time-outline', Priroda: 'leaf-outline', Kultura: 'book-outline', Religija: 'heart-outline', Sport: 'football-outline', Ostalo: 'location-outline' };

export default function AttractionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [attraction, setAttraction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({ Outfit_700Bold, Outfit_600SemiBold, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });

  useEffect(() => { if (id) fetchAttraction(); }, [id]);

  const fetchAttraction = async () => {
    try {
      const r = await axios.get(`${BACKEND}/api/tourism/attractions`);
      const found = r.data.find((a: any) => a.id === id);
      setAttraction(found || null);
    } catch {}
    setLoading(false);
  };

  if (loading || !fontsLoaded) return <View style={s.loadWrap}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!attraction) return (
    <View style={[s.loadWrap, { paddingTop: insets.top }]}>
      <Text style={s.errorTxt}>Znamenitost nije pronađena</Text>
      <TouchableOpacity style={s.backBtnAlt} onPress={() => router.back()}><Text style={s.backBtnTxt}>Nazad</Text></TouchableOpacity>
    </View>
  );

  const icon = CAT_ICONS[attraction.category] || 'location-outline';

  return (
    <View testID="attraction-detail" style={s.root}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await fetchAttraction(); setRefreshing(false); }}
            tintColor={C.primary}
            colors={[C.primary, C.accent]}
            progressBackgroundColor={C.surface}
          />
        }
      >
        {/* Map header */}
        <View style={s.mapWrap}>
          <LeafletMap
            locations={[{ id: attraction.id, latitude: attraction.latitude, longitude: attraction.longitude, name: attraction.name, address: '', category: '' }]}
            markerColors={{}} centerLat={attraction.latitude} centerLng={attraction.longitude}
          />
          <TouchableOpacity testID="back-attraction-btn" style={[s.backCircle, { top: insets.top + 10 }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={s.content}>
          <View style={s.catBadge}>
            <Ionicons name={icon} size={14} color={C.primary} />
            <Text style={s.catBadgeText}>{attraction.category}</Text>
          </View>

          <Text testID="attraction-name" style={s.name}>{attraction.name}</Text>

          <View style={s.divider} />

          <Text style={s.sectionTitle}>O znamenitosti</Text>
          {!!attraction.short_description && (
            <Text style={s.lead}>{attraction.short_description}</Text>
          )}
          {!!attraction.description && attraction.description !== attraction.short_description && (
            <Text style={s.desc}>{attraction.description}</Text>
          )}

          <View style={s.divider} />

          <Text style={s.sectionTitle}>Lokacija</Text>
          <View style={s.infoRow}>
            <Ionicons name="location-outline" size={18} color={C.primary} />
            <Text style={s.infoText}>Gradačac, Bosna i Hercegovina</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="navigate-outline" size={18} color={C.primary} />
            <Text style={s.infoText}>{attraction.latitude.toFixed(4)}, {attraction.longitude.toFixed(4)}</Text>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  errorTxt: { fontSize: 16, fontFamily: 'Manrope_500Medium', color: C.textSec },
  backBtnAlt: { marginTop: 16, backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnTxt: { color: '#fff', fontSize: 15, fontFamily: 'Manrope_700Bold' },
  mapWrap: { height: 220, position: 'relative' },
  backCircle: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, backgroundColor: C.surface, paddingHorizontal: 24, paddingTop: 24 },
  catBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary + '12', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 12 },
  catBadgeText: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: C.primary, marginLeft: 6 },
  name: { fontSize: 28, fontFamily: 'Outfit_700Bold', color: C.text, letterSpacing: -0.8 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', color: C.text, marginBottom: 12 },
  desc: { fontSize: 16, fontFamily: 'Manrope_400Regular', color: C.textSec, lineHeight: 26 },
  lead: { fontSize: 16, fontFamily: 'Manrope_500Medium', color: C.text, lineHeight: 26, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: C.text, marginLeft: 12 },
});
