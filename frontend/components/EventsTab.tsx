import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const PURPLE = '#7C3AED';

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  'Vijesti': { bg: '#DBEAFE', text: '#1D4ED8' },
  'Obavještenje': { bg: '#FEF3C7', text: '#D97706' },
  'Kultura': { bg: '#EDE9FE', text: '#7C3AED' },
  'Sport': { bg: '#FEE2E2', text: '#DC2626' },
  'Turizam': { bg: '#D1FAE5', text: '#059669' },
  'Ostalo': { bg: '#F3F4F6', text: '#6B7280' },
};

interface NewsItem { id: string; title: string; content: string; category: string; created_at: string; }
interface EventItem {
  id: string; title: string; description: string;
  location_name?: string; location?: string; date: string; time?: string;
}
interface Attraction { id: string; name: string; description?: string; category?: string; }

export default function EventsTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tArr } = useLanguage();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [n, e, a] = await Promise.all([
        fetch(`${BACKEND}/api/news`).then(r => r.json()),
        fetch(`${BACKEND}/api/events`).then(r => r.json()),
        fetch(`${BACKEND}/api/tourism/attractions`).then(r => r.json()),
      ]);
      setNews(Array.isArray(n) ? n : []);
      setEvents(Array.isArray(e) ? e : []);
      setAttractions(Array.isArray(a) ? a : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const formatDate = (dt: string) => {
    try {
      const MONTHS = tArr('events', 'months');
      const d = new Date(dt);
      return `${d.getDate()} ${MONTHS[d.getMonth()] || ''}`;
    } catch { return dt; }
  };

  return (
    <View style={[et.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={et.header}>
        <Text style={et.headerTitle}>{t('events', 'headerTitle')}</Text>
      </View>

      {loading ? (
        <View style={et.loadWrap}>
          <ActivityIndicator color={PURPLE} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Gradske Vijesti */}
          <View style={et.sec}>
            <View style={et.secRow}>
              <Text style={et.secEmoji}>📰</Text>
              <Text style={et.secTitle}>{t('events', 'newsSection')}</Text>
            </View>
            {news.length === 0 ? (
              <View style={et.emptyCard}>
                <Ionicons name="newspaper-outline" size={44} color="#D1D5DB" />
                <Text style={et.emptyTxt}>{t('events', 'noNews')}</Text>
              </View>
            ) : news.slice(0, 5).map(item => {
              const catStyle = CAT_COLORS[item.category] || CAT_COLORS['Ostalo'];
              return (
                <View key={item.id} style={et.newsCard}>
                  <View style={et.newsTop}>
                    <View style={[et.newsCatBadge, { backgroundColor: catStyle.bg }]}>
                      <Text style={[et.newsCatTxt, { color: catStyle.text }]}>{item.category}</Text>
                    </View>
                    <Text style={et.newsDate}>{formatDate(item.created_at)}</Text>
                  </View>
                  <Text style={et.newsTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={et.newsContent} numberOfLines={3}>{item.content}</Text>
                </View>
              );
            })}
          </View>

          {/* Upcoming Events */}
          <View style={et.sec}>
            <View style={et.secRow}>
              <Text style={et.secEmoji}>🎭</Text>
              <Text style={et.secTitle}>{t('events', 'eventsSection')}</Text>
            </View>
            {events.length === 0 ? (
              <View style={et.emptyCard}>
                <Ionicons name="calendar-outline" size={44} color="#D1D5DB" />
                <Text style={et.emptyTxt}>{t('events', 'noEvents')}</Text>
                <Text style={et.emptyDesc}>{t('events', 'noEventsDesc')}</Text>
              </View>
            ) : events.map(ev => {
              const MONTHS = tArr('events', 'months');
              const d = new Date(ev.date);
              const day = d.getDate().toString().padStart(2, '0');
              const month = MONTHS[d.getMonth()] || '';
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <View key={ev.id} style={et.eventCard}>
                  <View style={[et.dateBox, isToday && { backgroundColor: PURPLE }]}>
                    <Text style={[et.dateDay, isToday && { color: '#fff' }]}>{day}</Text>
                    <Text style={[et.dateMon, isToday && { color: 'rgba(255,255,255,0.85)' }]}>{month}</Text>
                  </View>
                  <View style={et.eventBody}>
                    <Text style={et.eventTitle} numberOfLines={1}>{ev.title}</Text>
                    <Text style={et.eventDesc} numberOfLines={2}>{ev.description}</Text>
                    <View style={et.eventMeta}>
                      {(ev.location_name || ev.location) && (
                        <View style={et.metaItem}>
                          <Ionicons name="location-outline" size={12} color="#6B7280" />
                          <Text style={et.metaTxt}>{ev.location_name || ev.location}</Text>
                        </View>
                      )}
                      {ev.time && (
                        <View style={et.metaItem}>
                          <Ionicons name="time-outline" size={12} color="#6B7280" />
                          <Text style={et.metaTxt}>{ev.time}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {isToday && <View style={et.todayBadge}><Text style={et.todayTxt}>{t('events', 'today')}</Text></View>}
                </View>
              );
            })}
          </View>

          {/* Attractions */}
          {attractions.length > 0 && (
            <View style={et.sec}>
              <View style={et.secRow}>
                <Text style={et.secEmoji}>🏛️</Text>
                <Text style={et.secTitle}>{t('events', 'attractionsSection')}</Text>
              </View>
              {attractions.map(a => (
                <TouchableOpacity key={a.id} style={et.attrCard} onPress={() => router.push(`/attraction/${a.id}`)}>
                  <View style={et.attrIcon}>
                    <Ionicons name="business-outline" size={22} color={PURPLE} />
                  </View>
                  <View style={et.attrBody}>
                    <Text style={et.attrName} numberOfLines={1}>{a.name}</Text>
                    {a.description && <Text style={et.attrDesc} numberOfLines={2}>{a.description}</Text>}
                    {a.category && <View style={et.attrCat}><Text style={et.attrCatTxt}>{a.category}</Text></View>}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const et = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#111827' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sec: { marginTop: 20, marginBottom: 4 },
  secRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, gap: 6 },
  secEmoji: { fontSize: 16 },
  secTitle: { fontSize: 17, fontFamily: 'Outfit_700Bold', color: '#111827' },
  emptyCard: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  emptyTxt: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#374151', marginTop: 12 },
  emptyDesc: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: '#9CA3AF', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  // News
  newsCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  newsTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  newsCatBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  newsCatTxt: { fontSize: 11, fontFamily: 'Manrope_700Bold' },
  newsDate: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: '#9CA3AF' },
  newsTitle: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#111827', marginBottom: 4 },
  newsContent: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#6B7280', lineHeight: 18 },
  // Events
  eventCard: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 10, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  dateBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: PURPLE + '15', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  dateDay: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: PURPLE },
  dateMon: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: PURPLE },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#111827' },
  eventDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#6B7280', marginTop: 3, lineHeight: 18 },
  eventMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaTxt: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: '#6B7280' },
  todayBadge: { backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  todayTxt: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: '#fff' },
  // Attractions
  attrCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  attrIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: PURPLE + '12', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  attrBody: { flex: 1 },
  attrName: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#111827' },
  attrDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#6B7280', marginTop: 3, lineHeight: 18 },
  attrCat: { backgroundColor: PURPLE + '12', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
  attrCatTxt: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: PURPLE },
});
