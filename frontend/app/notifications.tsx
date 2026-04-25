import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PURPLE = '#7C3AED';
const NOTIF_KEY = 'notif_last_seen';

interface NotifItem {
  id: string;
  type: 'news' | 'event' | 'offer';
  title: string;
  body: string;
  category: string;
  created_at: string;
  icon: string;
  color: string;
  location_id?: string;
}

const TYPE_COLORS = {
  news:  { bg: '#DBEAFE', text: '#1D4ED8' },
  event: { bg: '#EDE9FE', text: PURPLE },
  offer: { bg: '#FEF3C7', text: '#D97706' },
};

function relTime(dt: string) {
  if (!dt) return '';
  try {
    const diff = Date.now() - new Date(dt).getTime();
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    return new Date(dt).toLocaleDateString('bs-BA', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const [feed, ls] = await Promise.all([
        fetch(`${BACKEND}/api/notifications-feed`).then(r => r.json()),
        AsyncStorage.getItem(NOTIF_KEY),
      ]);
      setItems(Array.isArray(feed) ? feed : []);
      setLastSeen(ls || '');
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    await AsyncStorage.setItem(NOTIF_KEY, now);
    setLastSeen(now);
  }, []);

  const handlePress = useCallback((item: NotifItem) => {
    markAllRead();
    if (item.type === 'offer' && item.location_id) {
      router.push(`/location/${item.location_id}` as any);
    } else if (item.type === 'event') {
      router.push(`/event/${item.id}` as any);
    } else if (item.type === 'news') {
      router.push(`/news/${item.id}` as any);
    }
  }, [router, markAllRead]);

  const isNew = (item: NotifItem) => !lastSeen || String(item.created_at) > lastSeen;
  const unreadCount = items.filter(isNew).length;

  return (
    <View style={[ns.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={ns.header}>
        <TouchableOpacity style={ns.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={ns.titleWrap}>
          <Text style={ns.title}>{t('notifications', 'title')}</Text>
          {unreadCount > 0 && (
            <View style={ns.headerBadge}>
              <Text style={ns.headerBadgeTxt}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity style={ns.readAllBtn} onPress={markAllRead}>
            <Ionicons name="checkmark-done" size={15} color={PURPLE} />
            <Text style={ns.readAllTxt}>{t('notifications', 'markRead')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 88 }} />
        )}
      </View>

      {loading ? (
        <View style={ns.loadWrap}>
          <ActivityIndicator color={PURPLE} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
        >
          {items.length === 0 ? (
            <View style={ns.emptyWrap}>
              <View style={ns.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={44} color="#9CA3AF" />
              </View>
              <Text style={ns.emptyTxt}>{t('notifications', 'empty')}</Text>
              <Text style={ns.emptySub}>{t('notifications', 'emptySub')}</Text>
            </View>
          ) : (
            items.map(item => {
              const meta = TYPE_COLORS[item.type] || TYPE_COLORS.news;
              const typeLabel = t('notifications', `type${item.type.charAt(0).toUpperCase() + item.type.slice(1)}` as any);
              const fresh = isNew(item);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[ns.card, fresh && ns.cardNew]}
                  onPress={() => handlePress(item)}
                  activeOpacity={0.75}
                >
                  {/* Left color accent */}
                  <View style={[ns.accent, { backgroundColor: item.color }]} />

                  {/* Icon circle */}
                  <View style={[ns.iconWrap, { backgroundColor: meta.bg }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>

                  {/* Content */}
                  <View style={ns.content}>
                    <View style={ns.topRow}>
                      <View style={[ns.typeBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[ns.typeTxt, { color: meta.text }]}>{typeLabel}</Text>
                      </View>
                      {fresh && <View style={ns.newDot} />}
                      <Text style={ns.timeAgo}>{relTime(item.created_at)}</Text>
                    </View>
                    <Text style={ns.cardTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={ns.cardBody} numberOfLines={2}>{item.body}</Text>
                    {item.type === 'offer' && item.location_id && (
                      <View style={ns.ctaRow}>
                        <Text style={ns.ctaTxt}>{t('notifications', 'viewOffer')}</Text>
                        <Ionicons name="arrow-forward" size={13} color={PURPLE} />
                      </View>
                    )}
                    {item.type === 'event' && (
                      <View style={ns.ctaRow}>
                        <Text style={ns.ctaTxt}>Pogledaj događaj</Text>
                        <Ionicons name="arrow-forward" size={13} color={PURPLE} />
                      </View>
                    )}
                    {item.type === 'news' && (
                      <View style={ns.ctaRow}>
                        <Text style={ns.ctaTxt}>Pročitaj vijest</Text>
                        <Ionicons name="arrow-forward" size={13} color="#3B82F6" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const ns = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 4 },
  title: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#111827' },
  headerBadge: {
    backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  headerBadgeTxt: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: '#fff' },
  readAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#EDE9FE', borderRadius: 20, marginRight: 8,
  },
  readAllTxt: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: PURPLE },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTxt: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#374151' },
  emptySub: {
    fontSize: 13, fontFamily: 'Manrope_400Regular', color: '#9CA3AF',
    textAlign: 'center', marginTop: 8, lineHeight: 20,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  cardNew: { borderColor: '#C4B5FD', backgroundColor: '#FDFCFF' },
  accent: { width: 4, alignSelf: 'stretch' },
  iconWrap: {
    width: 46, height: 46, borderRadius: 14, margin: 12,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  content: { flex: 1, paddingVertical: 12, paddingRight: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  typeBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  typeTxt: { fontSize: 10, fontFamily: 'Manrope_700Bold' },
  newDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  timeAgo: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: '#9CA3AF', marginLeft: 'auto' as any },
  cardTitle: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#111827', marginBottom: 3 },
  cardBody: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#6B7280', lineHeight: 18 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ctaTxt: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: PURPLE },
});
