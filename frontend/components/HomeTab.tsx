import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  Image, Dimensions, RefreshControl, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');
const API = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const HERO_W = W - 40;

const NC = {
  bg: '#F5F6FA', surface: '#FFFFFF', purple: '#7C3AED', purpleLight: '#EDE9FE',
  text: '#111827', textSec: '#6B7280', textMute: '#9CA3AF', border: '#E5E7EB',
  green: '#10B981', greenBg: '#D1FAE5', orange: '#F59E0B', orangeBg: '#FEF3C7',
  yellow: '#EAB308', red: '#EF4444',
};

const HERO_COLORS = ['#1A1A2E', '#16213E', '#2D1B69', '#1B2838', '#1C3A2E', '#2C1A0E'];

interface Loc {
  id: string; name: string; category: string; address: string;
  latitude: number; longitude: number; avg_rating?: number;
  images?: string[]; distance?: number; is_open?: boolean;
}
interface Offer {
  id: string; location_id: string; title: string; description?: string;
  discount_percent?: number; expires_at?: string;
  location_name?: string; location_image?: string; distance?: number;
}
interface EvItem { id: string; title: string; description?: string; date: string; location?: string; }
interface HeroItem {
  id: string; type: 'event' | 'offer'; title: string; subtitle: string;
  bgColor: string; image?: string; badge: string; badgeColor: string;
  ctaText: string; ctaColor: string; locationId?: string; distance?: number;
}

const QUICK = [
  { label: 'Restorani', icon: 'restaurant',  color: '#EF4444', bg: '#FEE2E2', cat: 'restaurant' },
  { label: 'Događaji',  icon: 'calendar',    color: '#7C3AED', bg: '#EDE9FE', cat: '' },
  { label: 'Akcije',    icon: 'pricetag',    color: '#F59E0B', bg: '#FEF3C7', cat: '' },
  { label: 'Smještaj',  icon: 'bed',         color: '#3B82F6', bg: '#DBEAFE', cat: 'prenociste' },
  { label: 'Apoteke',   icon: 'medkit',      color: '#10B981', bg: '#D1FAE5', cat: 'pharmacy' },
  { label: 'Parkinzi',  icon: 'car-sport',   color: '#4A90D9', bg: '#DBEAFE', cat: 'parking' },
];

function calcDist(la1: number, lo1: number, la2: number, lo2: number) {
  const R = 6371000, p = Math.PI / 180;
  const a = 0.5 - Math.cos((la2 - la1) * p) / 2
    + Math.cos(la1 * p) * Math.cos(la2 * p) * (1 - Math.cos((lo2 - lo1) * p)) / 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}
function distStr(m?: number) { return !m ? '' : m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`; }
function timeLeft(exp?: string) {
  if (!exp) return '';
  const diff = new Date(exp).getTime() - Date.now();
  if (diff < 0) return 'Isteklo';
  const h = Math.floor(diff / 3600000);
  return h < 24 ? `Još ${h}h` : `Još ${Math.floor(h / 24)}d`;
}
function imgUri(img?: string) {
  return !img ? undefined : img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
}

function buildHero(events: EvItem[], offers: Offer[]): HeroItem[] {
  const now = new Date();
  const tmr = new Date(now.getTime() + 86400000);
  const items: HeroItem[] = [];
  events.slice(0, 3).forEach((e, i) => {
    const d = new Date(e.date);
    const time = d.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' });
    let badge = d.toLocaleDateString('bs-BA', { day: 'numeric', month: 'short' }), badgeColor = '#3B82F6';
    if (d.toDateString() === now.toDateString()) { badge = `DANAS ${time}`; badgeColor = NC.green; }
    else if (d.toDateString() === tmr.toDateString()) { badge = `SUTRA ${time}`; badgeColor = NC.purple; }
    items.push({ id: e.id, type: 'event', title: e.title, subtitle: e.location || 'Gradačac', bgColor: HERO_COLORS[i], badge, badgeColor, ctaText: 'Detalji', ctaColor: NC.green });
  });
  offers.filter(o => (o.discount_percent || 0) > 0).slice(0, 3).forEach((o, i) => {
    let badge = `-${o.discount_percent}%`, badgeColor = NC.orange;
    if (o.expires_at) {
      const h = Math.floor((new Date(o.expires_at).getTime() - Date.now()) / 3600000);
      if (h > 0 && h < 24) badge = `JOŠ ${h}H`;
    }
    items.push({ id: o.id, type: 'offer', title: o.title, subtitle: o.location_name || 'Lokacija', bgColor: HERO_COLORS[(i + 3) % HERO_COLORS.length], image: o.location_image, badge, badgeColor, ctaText: 'Iskoristi', ctaColor: NC.orange, locationId: o.location_id, distance: o.distance });
  });
  return items.slice(0, 6);
}

export default function HomeTab({ userLoc, setActiveTab, setMapCategory }: {
  userLoc: { latitude: number; longitude: number } | null;
  setActiveTab: (t: string) => void;
  setMapCategory: (cat: string) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [locs, setLocs] = useState<Loc[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [events, setEvents] = useState<EvItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [l, o, e] = await Promise.all([
        fetch(`${API}/api/locations`).then(r => r.json()),
        fetch(`${API}/api/offers`).then(r => r.json()),
        fetch(`${API}/api/events`).then(r => r.json()),
      ]);
      const locsRaw: Loc[] = l;
      const withDist = userLoc
        ? locsRaw.map(loc => ({ ...loc, distance: calcDist(userLoc.latitude, userLoc.longitude, loc.latitude, loc.longitude) })).sort((a, b) => (a.distance || 0) - (b.distance || 0))
        : locsRaw;
      setLocs(withDist);
      const locMap = Object.fromEntries(withDist.map(loc => [loc.id, loc]));
      setOffers((o as Offer[]).map(of => ({
        ...of,
        location_name: locMap[of.location_id]?.name,
        location_image: locMap[of.location_id]?.images?.[0],
        distance: locMap[of.location_id]?.distance,
      })));
      setEvents(e);
    } catch (err) { console.log('HomeTab fetch error:', err); }
  }, [userLoc]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }, [fetchData]);

  const heroItems = buildHero(events, offers);
  const nearbyLocs = locs.filter(l => l.category !== 'parking').slice(0, 8);
  const specials = offers.filter(o => (o.discount_percent || 0) > 0).slice(0, 4);

  return (
    <ScrollView
      style={[hs.root, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NC.purple} />}
    >
      {/* ── Header ── */}
      <View style={hs.header}>
        <TouchableOpacity style={hs.locPill}>
          <Ionicons name="location" size={14} color={NC.purple} />
          <Text style={hs.locTxt}>Gradačac</Text>
          <Ionicons name="chevron-down" size={12} color={NC.purple} />
        </TouchableOpacity>
        <TouchableOpacity style={hs.searchBar} onPress={() => setActiveTab('mapa')}>
          <Ionicons name="search-outline" size={15} color={NC.textMute} />
          <Text style={hs.searchPh}>Pretraži lokacije, ponude...</Text>
        </TouchableOpacity>
        <TouchableOpacity style={hs.bellBtn} onPress={() => router.push('/about')}>
          <Ionicons name="notifications-outline" size={22} color={NC.text} />
        </TouchableOpacity>
      </View>

      {/* ── "Danas u Gradačcu" ── */}
      {heroItems.length > 0 && (
        <View style={hs.sec}>
          <View style={hs.secRow}>
            <Text style={hs.secEmoji}>🔥</Text>
            <Text style={hs.secTitle}>Danas u Gradačcu</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity><Text style={hs.secLink}>Sve {'>'}</Text></TouchableOpacity>
          </View>
          <FlatList
            data={heroItems} keyExtractor={i => i.id} horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            snapToInterval={HERO_W + 12} decelerationRate="fast"
            renderItem={({ item: it }) => (
              <TouchableOpacity
                style={[hs.heroCard, { width: HERO_W }]}
                onPress={() => it.locationId && router.push(`/location/${it.locationId}`)}
                activeOpacity={0.95}
              >
                {it.image
                  ? <Image source={{ uri: imgUri(it.image) }} style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]} resizeMode="cover" />
                  : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: it.bgColor, borderRadius: 20 }]} />}
                <View style={hs.heroOverlay} />
                <View style={hs.heroTop}>
                  <View style={[hs.heroBadge, { backgroundColor: it.badgeColor }]}>
                    <Text style={hs.heroBadgeTxt}>{it.badge}</Text>
                  </View>
                  <View style={hs.heroHeart}><Ionicons name="heart-outline" size={18} color="#fff" /></View>
                </View>
                <View style={hs.heroBot}>
                  <Text style={hs.heroTitle} numberOfLines={2}>{it.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                    <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
                    <Text style={hs.heroSub} numberOfLines={1}>{it.subtitle}</Text>
                  </View>
                  <View style={hs.heroFooter}>
                    {it.distance != null && <Text style={hs.heroDist}>{distStr(it.distance)}</Text>}
                    <TouchableOpacity
                      style={[hs.heroCta, { backgroundColor: it.ctaColor }]}
                      onPress={() => it.locationId && router.push(`/location/${it.locationId}`)}
                    >
                      <Text style={hs.heroCtaTxt}>{it.ctaText}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ── "Blizu tebe" ── */}
      {nearbyLocs.length > 0 && (
        <View style={hs.sec}>
          <View style={hs.secRow}>
            <Ionicons name="navigate" size={16} color={NC.text} />
            <Text style={hs.secTitle}>Blizu tebe</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => setActiveTab('mapa')}>
              <Text style={hs.secLink}>Mapa {'>'}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={nearbyLocs} keyExtractor={i => i.id} horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            renderItem={({ item: loc }) => {
              const lo = offers.find(o => o.location_id === loc.id && (o.discount_percent || 0) > 0);
              return (
                <TouchableOpacity style={hs.nearCard} onPress={() => router.push(`/location/${loc.id}`)} activeOpacity={0.9}>
                  <View style={hs.nearImgWrap}>
                    {loc.images?.[0]
                      ? <Image source={{ uri: imgUri(loc.images[0]) }} style={hs.nearImg} resizeMode="cover" />
                      : <View style={[hs.nearImg, { backgroundColor: NC.purpleLight, justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="storefront-outline" size={26} color={NC.purple} />
                      </View>}
                    <View style={[hs.nearBadge, { backgroundColor: loc.is_open !== false ? NC.green : NC.orange }]}>
                      <Text style={hs.nearBadgeTxt}>{loc.is_open !== false ? 'OTVORENO' : 'ZATVORENO'}</Text>
                    </View>
                  </View>
                  <View style={hs.nearInfo}>
                    <Text style={hs.nearName} numberOfLines={1}>{loc.name}</Text>
                    <View style={hs.nearMeta}>
                      <Ionicons name="location-outline" size={11} color={NC.textSec} />
                      <Text style={hs.nearMetaTxt}>{distStr(loc.distance)}</Text>
                      {(loc.avg_rating || 0) > 0 && (
                        <><Ionicons name="star" size={11} color={NC.yellow} style={{ marginLeft: 6 }} />
                          <Text style={hs.nearMetaTxt}>{loc.avg_rating?.toFixed(1)}</Text></>
                      )}
                    </View>
                    {lo && <Text style={hs.nearOffer} numberOfLines={1}>🏷 -{lo.discount_percent}% {lo.title}</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* ── "Posebne ponude" ── */}
      {specials.length > 0 && (
        <View style={hs.sec}>
          <View style={hs.secRow}>
            <Text style={hs.secEmoji}>🎯</Text>
            <Text style={hs.secTitle}>Posebne ponude</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity><Text style={hs.secLink}>Sve {'>'}</Text></TouchableOpacity>
          </View>
          <View style={hs.specialsList}>
            {specials.map((o, idx) => (
              <TouchableOpacity
                key={o.id}
                style={[hs.specialRow, idx === specials.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => o.location_id && router.push(`/location/${o.location_id}`)}
              >
                <View style={hs.specialThumb}>
                  {o.location_image
                    ? <Image source={{ uri: imgUri(o.location_image) }} style={hs.specialImg} resizeMode="cover" />
                    : <View style={[hs.specialImg, { backgroundColor: NC.orangeBg, justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="pricetag" size={20} color={NC.orange} />
                    </View>}
                  {(o.discount_percent || 0) > 0 && (
                    <View style={hs.discBadge}><Text style={hs.discTxt}>-{o.discount_percent}%</Text></View>
                  )}
                </View>
                <View style={hs.specialInfo}>
                  <Text style={hs.specialTitle} numberOfLines={1}>{o.title}</Text>
                  <Text style={hs.specialLoc} numberOfLines={1}>{o.location_name}</Text>
                  {o.expires_at && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                      <Ionicons name="time-outline" size={11} color={NC.orange} />
                      <Text style={hs.specialExp}>{timeLeft(o.expires_at)}</Text>
                    </View>
                  )}
                </View>
                <View style={hs.specialRight}>
                  {o.distance != null && <Text style={hs.specialDist}>{distStr(o.distance)}</Text>}
                  <Ionicons name="bookmark-outline" size={18} color={NC.textMute} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── "Brzi pristup" ── */}
      <View style={hs.sec}>
        <View style={hs.secRow}>
          <Text style={hs.secEmoji}>⚡</Text>
          <Text style={hs.secTitle}>Brzi pristup</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 18 }}>
          {QUICK.map(q => (
            <TouchableOpacity
              key={q.label} style={hs.quickItem}
              onPress={() => { setActiveTab('mapa'); if (q.cat) setMapCategory(q.cat); }}
            >
              <View style={[hs.quickIcon, { backgroundColor: q.bg }]}>
                <Ionicons name={q.icon as any} size={24} color={q.color} />
              </View>
              <Text style={hs.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── QR Banner ── */}
      <TouchableOpacity style={hs.qrBanner} onPress={() => router.push('/qr')} activeOpacity={0.92}>
        <View style={hs.qrIconBox}><Ionicons name="qr-code" size={32} color={NC.purple} /></View>
        <View style={hs.qrText}>
          <Text style={hs.qrTitle}>Skeniraj QR i ostvari popuste</Text>
          <Text style={hs.qrSub}>Otključaj posebne ponude u lokalima!</Text>
        </View>
        <View style={hs.qrBtn}>
          <Ionicons name="qr-code-outline" size={13} color="#fff" />
          <Text style={hs.qrBtnTxt}>Skeniraj</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const hs = StyleSheet.create({
  root: { flex: 1, backgroundColor: NC.bg },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: NC.border },
  locPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: NC.purpleLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  locTxt: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: NC.purple },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: NC.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: NC.border },
  searchPh: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: NC.textMute },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: NC.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: NC.border },
  // Section
  sec: { marginBottom: 20, marginTop: 6 },
  secRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, gap: 6 },
  secEmoji: { fontSize: 16 },
  secTitle: { fontSize: 17, fontFamily: 'Outfit_700Bold', color: NC.text },
  secLink: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: NC.purple },
  // Hero
  heroCard: { height: 210, borderRadius: 20, overflow: 'hidden', justifyContent: 'space-between' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  heroBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeTxt: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: '#fff', letterSpacing: 0.5 },
  heroHeart: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  heroBot: { padding: 14 },
  heroTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#fff', lineHeight: 26, marginBottom: 4 },
  heroSub: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: 'rgba(255,255,255,0.8)' },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroDist: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  heroCta: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 7 },
  heroCtaTxt: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: '#fff' },
  // Nearby
  nearCard: { width: 155, backgroundColor: NC.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: NC.border },
  nearImgWrap: { position: 'relative', height: 110 },
  nearImg: { width: '100%', height: 110 },
  nearBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  nearBadgeTxt: { fontSize: 9, fontFamily: 'Manrope_700Bold', color: '#fff', letterSpacing: 0.5 },
  nearInfo: { padding: 10 },
  nearName: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: NC.text, marginBottom: 4 },
  nearMeta: { flexDirection: 'row', alignItems: 'center' },
  nearMetaTxt: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: NC.textSec, marginLeft: 2 },
  nearOffer: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: NC.green, marginTop: 4 },
  // Specials
  specialsList: { marginHorizontal: 20, backgroundColor: NC.surface, borderRadius: 16, borderWidth: 1, borderColor: NC.border, overflow: 'hidden' },
  specialRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: NC.border },
  specialThumb: { position: 'relative', marginRight: 12 },
  specialImg: { width: 60, height: 60, borderRadius: 12 },
  discBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: NC.orange, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  discTxt: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: '#fff' },
  specialInfo: { flex: 1 },
  specialTitle: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: NC.text },
  specialLoc: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: NC.textSec, marginTop: 2 },
  specialExp: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: NC.orange },
  specialRight: { alignItems: 'flex-end', gap: 6 },
  specialDist: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: NC.purple },
  // Quick
  quickItem: { alignItems: 'center', gap: 6 },
  quickIcon: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: NC.text, textAlign: 'center' },
  // QR
  qrBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#EDE9FE', borderRadius: 18, padding: 16, gap: 12 },
  qrIconBox: { width: 52, height: 52, backgroundColor: '#fff', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  qrText: { flex: 1 },
  qrTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: NC.text },
  qrSub: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: NC.textSec, marginTop: 2 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: NC.purple, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  qrBtnTxt: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: '#fff' },
});
