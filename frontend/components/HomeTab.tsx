import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  Image, Dimensions, RefreshControl, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';

const NOTIF_LAST_SEEN_KEY = 'notif_last_seen';

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

/* Fallback slike za atrakcije po kategoriji */
const ATTR_FALLBACK: Record<string, string> = {
  'Historija':   'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=600&q=80',
  'Kultura':     'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&q=80',
  'Priroda':     'https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&h=300&w=500',
  'Religija':    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  'Sport':       'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&h=300&w=500',
};
const ATTR_DEFAULT_IMG = 'https://images.pexels.com/photos/1486976/pexels-photo-1486976.jpeg?auto=compress&cs=tinysrgb&h=300&w=500';

function attrImgUri(a: Attraction): string {
  if (a.images && a.images.length > 0) {
    const img = a.images[0];
    if (!img) return ATTR_FALLBACK[a.category || ''] || ATTR_DEFAULT_IMG;
    if (img.startsWith('data:') || img.startsWith('http')) return img;
    // Slike su sačuvane kao /api/uploads/xxx.jpg ili api/uploads/xxx.jpg
    if (img.startsWith('/') || img.startsWith('api/')) return `${API}${img.startsWith('/') ? img : '/' + img}`;
    return `${API}/api/uploads/${img}`;
  }
  return ATTR_FALLBACK[a.category || ''] || ATTR_DEFAULT_IMG;
}

/* Fallback slike po kategoriji */
const CAT_IMAGES: Record<string, string> = {
  restaurant:   'https://images.pexels.com/photos/33158981/pexels-photo-33158981.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=600',
  cafe:         'https://images.pexels.com/photos/15259599/pexels-photo-15259599.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=600',
  market:       'https://images.pexels.com/photos/5951182/pexels-photo-5951182.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=600',
  auto_service: 'https://images.pexels.com/photos/4489761/pexels-photo-4489761.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=600',
  pharmacy:     'https://images.unsplash.com/photo-1765031092161-a9ebe556117e?w=600&q=80',
  gas_station:  'https://images.unsplash.com/photo-1717988241438-408ebc1a04c0?w=600&q=80',
  parking:      'https://images.unsplash.com/photo-1740479231174-43522f4eab3f?w=600&q=80',
  prenociste:   'https://images.pexels.com/photos/7821341/pexels-photo-7821341.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=600',
};

/* Hero pozadine - ljepote Bosne i Hercegovine */
const HERO_BKGS = [
  'https://images.unsplash.com/photo-1723083640587-7fbdf55ff158?w=800&q=80',
  'https://images.pexels.com/photos/12657546/pexels-photo-12657546.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=800',
  'https://images.pexels.com/photos/19101067/pexels-photo-19101067.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=800',
  'https://images.pexels.com/photos/30894209/pexels-photo-30894209.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=800',
  'https://images.unsplash.com/photo-1719915959351-24e8e0861879?w=800&q=80',
  'https://images.unsplash.com/photo-1723083640621-9b5927252b79?w=800&q=80',
];

function catImg(cat?: string) { return cat ? (CAT_IMAGES[cat] || CAT_IMAGES.restaurant) : CAT_IMAGES.restaurant; }

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
interface Attraction { id: string; name: string; short_description?: string; description?: string; category?: string; images?: string[]; }
interface HeroItem {
  id: string; type: 'event' | 'offer'; title: string; subtitle: string;
  bgColor: string; image?: string; badge: string; badgeColor: string;
  ctaText: string; ctaColor: string; locationId?: string; distance?: number;
}

const QUICK = [
  { labelKey: 'quickRestaurants', icon: 'restaurant',  color: '#EF4444', bg: '#FEE2E2', cat: 'restaurant', tab: 'mapa' },
  { labelKey: 'quickEvents',  icon: 'calendar',    color: '#7C3AED', bg: '#EDE9FE', cat: '', tab: 'rezervacije' },
  { labelKey: 'quickEmergency', icon: 'call',        color: '#EF4444', bg: '#FEF2F2', cat: '', tab: 'emergency' },
  { labelKey: 'quickAccommodation',  icon: 'bed',         color: '#3B82F6', bg: '#DBEAFE', cat: 'prenociste', tab: 'mapa' },
  { labelKey: 'quickPharmacies',   icon: 'medkit',      color: '#10B981', bg: '#D1FAE5', cat: 'pharmacy', tab: 'mapa' },
  { labelKey: 'quickParking',  icon: 'car-sport',   color: '#4A90D9', bg: '#DBEAFE', cat: 'parking', tab: 'mapa' },
];

function calcDist(la1: number, lo1: number, la2: number, lo2: number) {
  const R = 6371000, p = Math.PI / 180;
  const a = 0.5 - Math.cos((la2 - la1) * p) / 2
    + Math.cos(la1 * p) * Math.cos(la2 * p) * (1 - Math.cos((lo2 - lo1) * p)) / 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}
function distStr(m?: number) { return !m ? '' : m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`; }
function timeLeft(exp?: string, t?: (s: string, k: string) => string) {
  if (!exp) return '';
  const diff = new Date(exp).getTime() - Date.now();
  if (diff < 0) return t ? t('home', 'expired') : 'Isteklo';
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${t ? t('home', 'today') : 'JOŠ'} ${h}h`;
  return `${t ? t('home', 'tomorrow') : 'JOŠ'} ${Math.floor(h / 24)}d`;
}
function imgUri(img?: string) {
  if (!img) return undefined;
  if (img.startsWith('data:') || img.startsWith('http')) return img;
  return `data:image/jpeg;base64,${img}`;
}

function buildHero(events: EvItem[], offers: Offer[], t: (s: string, k: string) => string): HeroItem[] {
  const now = new Date();
  const tmr = new Date(now.getTime() + 86400000);
  const items: HeroItem[] = [];
  events.slice(0, 3).forEach((e, i) => {
    const d = new Date(e.date);
    const time = d.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' });
    let badge = d.toLocaleDateString('bs-BA', { day: 'numeric', month: 'short' }), badgeColor = '#3B82F6';
    if (d.toDateString() === now.toDateString()) { badge = `${t('home','today')} ${time}`; badgeColor = NC.green; }
    else if (d.toDateString() === tmr.toDateString()) { badge = `${t('home','tomorrow')} ${time}`; badgeColor = NC.purple; }
    items.push({ id: e.id, type: 'event', title: e.title, subtitle: e.location || 'Gradačac', bgColor: HERO_COLORS[i], badge, badgeColor, ctaText: t('home','details'), ctaColor: NC.green });
  });
  offers.filter(o => (o.discount_percent || 0) > 0).slice(0, 3).forEach((o, i) => {
    let badge = `-${o.discount_percent}%`, badgeColor = NC.orange;
    if (o.expires_at) {
      const h = Math.floor((new Date(o.expires_at).getTime() - Date.now()) / 3600000);
      if (h > 0 && h < 24) badge = `${t('home','today')} ${h}H`;
    }
    items.push({ id: o.id, type: 'offer', title: o.title, subtitle: o.location_name || 'Lokacija', bgColor: HERO_COLORS[(i + 3) % HERO_COLORS.length], image: o.location_image, badge, badgeColor, ctaText: t('home','use'), ctaColor: NC.orange, locationId: o.location_id, distance: o.distance });
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
  const { t } = useLanguage();
  const [locs, setLocs] = useState<Loc[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [events, setEvents] = useState<EvItem[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [l, o, e, a] = await Promise.all([
        fetch(`${API}/api/locations`).then(r => r.json()),
        fetch(`${API}/api/offers`).then(r => r.json()),
        fetch(`${API}/api/events`).then(r => r.json()),
        fetch(`${API}/api/tourism/attractions`).then(r => r.json()),
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
      setAttractions(Array.isArray(a) ? a.slice(0, 8) : []);
    } catch (err) { console.log('HomeTab fetch error:', err); }
  }, [userLoc]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }, [fetchData]);

  // Load unread notification count
  const loadUnreadCount = useCallback(async () => {
    try {
      const [feed, lastSeen] = await Promise.all([
        fetch(`${API}/api/notifications-feed`).then(r => r.json()),
        AsyncStorage.getItem(NOTIF_LAST_SEEN_KEY),
      ]);
      const count = Array.isArray(feed)
        ? feed.filter((n: any) => !lastSeen || String(n.created_at) > lastSeen).length
        : 0;
      setUnreadCount(count);
    } catch {}
  }, []);

  useEffect(() => { loadUnreadCount(); }, [loadUnreadCount]);

  const heroItems = buildHero(events, offers, t);
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
          <Text style={hs.locTxt}>{t('home', 'locationPill')}</Text>
          <Ionicons name="chevron-down" size={12} color={NC.purple} />
        </TouchableOpacity>
        <TouchableOpacity style={hs.searchBar} onPress={() => setActiveTab('mapa')}>
          <Ionicons name="search-outline" size={15} color={NC.textMute} />
          <Text style={hs.searchPh}>{t('home', 'searchPlaceholder')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={hs.bellBtn} onPress={() => router.push('/notifications' as any)}>
          <Ionicons name="notifications-outline" size={22} color={NC.text} />
          {unreadCount > 0 && (
            <View style={hs.bellBadge}>
              <Text style={hs.bellBadgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── "Danas u Gradačcu" ── */}
      {heroItems.length > 0 && (
        <View style={hs.sec}>
          <View style={hs.secRow}>
            <Text style={hs.secEmoji}>🔥</Text>
            <Text style={hs.secTitle}>{t('home', 'todayTitle')}</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity><Text style={hs.secLink}>{t('common', 'seeAll')}</Text></TouchableOpacity>
          </View>
          <FlatList
            data={heroItems} keyExtractor={i => i.id} horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            snapToInterval={HERO_W + 12} decelerationRate="fast"
            renderItem={({ item: it, index }) => (
              <TouchableOpacity
                style={[hs.heroCard, { width: HERO_W }]}
                onPress={() => {
                  if (it.type === 'event') router.push(`/event/${it.id}` as any);
                  else if (it.locationId) router.push(`/location/${it.locationId}` as any);
                }}
                activeOpacity={0.95}
              >
                <Image
                  source={{ uri: imgUri(it.image) || HERO_BKGS[index % HERO_BKGS.length] }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
                  resizeMode="cover"
                />
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
                      onPress={() => {
                        if (it.type === 'event') router.push(`/event/${it.id}` as any);
                        else if (it.locationId) router.push(`/location/${it.locationId}` as any);
                      }}
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
            <Text style={hs.secTitle}>{t('home', 'nearbyTitle')}</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => setActiveTab('mapa')}>
              <Text style={hs.secLink}>{t('home', 'mapLink')}</Text>
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
                    <Image
                      source={{ uri: imgUri(loc.images?.[0]) || catImg(loc.category) }}
                      style={hs.nearImg}
                      resizeMode="cover"
                    />
                    <View style={[hs.nearBadge, { backgroundColor: loc.is_open !== false ? NC.green : NC.orange }]}>
                      <Text style={hs.nearBadgeTxt}>{loc.is_open !== false ? t('home','open') : t('home','closed')}</Text>
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
            <Text style={hs.secTitle}>{t('home', 'specialsTitle')}</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity><Text style={hs.secLink}>{t('common', 'seeAll')}</Text></TouchableOpacity>
          </View>
          <View style={hs.specialsList}>
            {specials.map((o, idx) => (
              <TouchableOpacity
                key={o.id}
                style={[hs.specialRow, idx === specials.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => o.location_id && router.push(`/location/${o.location_id}`)}
              >
                <View style={hs.specialThumb}>
                  <Image
                    source={{ uri: imgUri(o.location_image) || CAT_IMAGES.restaurant }}
                    style={hs.specialImg}
                    resizeMode="cover"
                  />
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

      {/* ── "Znamenitosti" ── */}
      {attractions.length > 0 && (
        <View style={hs.sec}>
          <View style={hs.secRow}>
            <Text style={hs.secEmoji}>🏛️</Text>
            <Text style={hs.secTitle}>Znamenitosti</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity><Text style={hs.secLink}>Sve</Text></TouchableOpacity>
          </View>
          <FlatList
            data={attractions}
            keyExtractor={a => a.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            renderItem={({ item: a }) => (
              <TouchableOpacity
                style={hs.attrCard}
                onPress={() => router.push(`/attraction/${a.id}` as any)}
                activeOpacity={0.88}
              >
                {/* Slika */}
                <Image
                  source={{ uri: attrImgUri(a) }}
                  style={hs.attrImg}
                  resizeMode="cover"
                />
                {/* Kategorija badge na slici */}
                {a.category && (
                  <View style={hs.attrCatBadge}>
                    <Text style={hs.attrCatBadgeTxt}>{a.category}</Text>
                  </View>
                )}
                {/* Tekst ispod */}
                <View style={hs.attrInfo}>
                  <Text style={hs.attrName} numberOfLines={2}>{a.name}</Text>
                  {!!(a.short_description || a.description) && (
                    <Text style={hs.attrDesc} numberOfLines={2}>
                      {a.short_description || a.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ── "Brzi pristup" ── */}
      <View style={hs.sec}>
        <View style={hs.secRow}>
          <Text style={hs.secEmoji}>⚡</Text>
          <Text style={hs.secTitle}>{t('home', 'quickAccessTitle')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 18 }}>
          {QUICK.map(q => (
            <TouchableOpacity
              key={q.labelKey} style={hs.quickItem}
              onPress={() => {
                if (q.tab === 'emergency') { router.push('/emergency'); return; }
                setActiveTab(q.tab || 'mapa');
                if (q.cat) setMapCategory(q.cat);
              }}
            >
              <View style={[hs.quickIcon, { backgroundColor: q.bg }]}>
                <Ionicons name={q.icon as any} size={24} color={q.color} />
              </View>
              <Text style={hs.quickLabel}>{t('home', q.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── QR Banner ── */}
      <TouchableOpacity style={hs.qrBanner} onPress={() => router.push('/qr')} activeOpacity={0.92}>
        <View style={hs.qrIconBox}><Ionicons name="qr-code" size={32} color={NC.purple} /></View>
        <View style={hs.qrText}>
          <Text style={hs.qrTitle}>{t('home', 'qrBannerTitle')}</Text>
          <Text style={hs.qrSub}>{t('home', 'qrBannerSub')}</Text>
        </View>
        <View style={hs.qrBtn}>
          <Ionicons name="qr-code-outline" size={13} color="#fff" />
          <Text style={hs.qrBtnTxt}>{t('home', 'qrScan')}</Text>
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
  bellBadge: { position: 'absolute', top: 1, right: 1, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  bellBadgeTxt: { fontSize: 9, fontFamily: 'Manrope_700Bold', color: '#fff' },
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
  // Attractions
  attrCard: { width: 160, backgroundColor: NC.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: NC.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  attrImg: { width: '100%', height: 120 },
  attrCatBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(124,58,237,0.85)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  attrCatBadgeTxt: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: '#fff', letterSpacing: 0.3 },
  attrInfo: { padding: 10, paddingTop: 9 },
  attrName: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: NC.text, lineHeight: 18, marginBottom: 3 },
  attrDesc: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: NC.textSec, lineHeight: 16 },
  // QR
  qrBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#EDE9FE', borderRadius: 18, padding: 16, gap: 12 },
  qrIconBox: { width: 52, height: 52, backgroundColor: '#fff', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  qrText: { flex: 1 },
  qrTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: NC.text },
  qrSub: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: NC.textSec, marginTop: 2 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: NC.purple, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  qrBtnTxt: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: '#fff' },
});
