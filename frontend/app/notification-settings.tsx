import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, StatusBar, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PURPLE = '#7C3AED';
export const NOTIF_PREFS_KEY = 'notif_prefs_v2';

export interface NotifPrefs {
  enabled: boolean;
  categories: string[];  // ["news","events","offers"] or [] = all
}

const DEFAULT_PREFS: NotifPrefs = {
  enabled: true,
  categories: ['news', 'events', 'offers'],
};

const CAT_OPTIONS = [
  { id: 'news',   label: 'Vijesti',   icon: 'newspaper-outline',  color: '#3B82F6', bg: '#DBEAFE',
    desc: 'Gradske vijesti i obavještenja' },
  { id: 'events', label: 'Događaji',  icon: 'calendar-outline',   color: PURPLE,    bg: '#EDE9FE',
    desc: 'Predstojeći događaji u gradu' },
  { id: 'offers', label: 'Ponude',    icon: 'pricetag-outline',   color: '#F59E0B', bg: '#FEF3C7',
    desc: 'Popusti i posebne ponude' },
];

async function getExpoPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch { return null; }
}

async function syncWithBackend(prefs: NotifPrefs) {
  const token = await getExpoPushToken();
  if (!token) return;
  try {
    await fetch(`${BACKEND}/api/push/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, categories: prefs.categories, enabled: prefs.enabled }),
    });
  } catch {}
}

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) setPrefs(JSON.parse(raw));
      if (Platform.OS !== 'web') {
        const { status } = await Notifications.getPermissionsAsync();
        setHasPermission(status === 'granted');
      } else {
        setHasPermission(false);
      }
    })();
  }, []);

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status !== 'granted') {
      Alert.alert('Dozvola odbijena', 'Dozvoli notifikacije u Podešavanjima telefona da bi primao/la obavještenja.');
    }
  };

  const toggleEnabled = useCallback((val: boolean) => {
    setPrefs(p => ({ ...p, enabled: val }));
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setPrefs(p => {
      const cats = p.categories.includes(id)
        ? p.categories.filter(c => c !== id)
        : [...p.categories, id];
      return { ...p, categories: cats };
    });
  }, []);

  const save = async () => {
    if (prefs.enabled && prefs.categories.length === 0) {
      Alert.alert('Odaberi bar jednu kategoriju', 'Mora biti odabrana bar jedna kategorija obavještenja.');
      return;
    }
    setSaving(true);
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
    await syncWithBackend(prefs);
    setSaving(false);
    Alert.alert('Sačuvano ✓', 'Podešavanja notifikacija su ažurirana.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const permGranted = hasPermission === true;

  return (
    <View style={[ns.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={ns.header}>
        <TouchableOpacity style={ns.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={ns.title}>Podešavanja obavještenja</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Permission banner */}
        {hasPermission === false && Platform.OS !== 'web' && (
          <TouchableOpacity style={ns.permBanner} onPress={requestPermission}>
            <Ionicons name="notifications-off" size={22} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={ns.permTitle}>Notifikacije nisu dozvoljene</Text>
              <Text style={ns.permSub}>Tapni ovdje da dozvoliš</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D97706" />
          </TouchableOpacity>
        )}

        {/* Master toggle */}
        <View style={ns.section}>
          <Text style={ns.sectionTitle}>Opće podešavanja</Text>
          <View style={ns.card}>
            <View style={[ns.iconWrap, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="notifications" size={22} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ns.rowLabel}>Primaj obavještenja</Text>
              <Text style={ns.rowSub}>Uključi ili isključi sve notifikacije</Text>
            </View>
            <Switch
              value={prefs.enabled}
              onValueChange={toggleEnabled}
              trackColor={{ false: '#E5E7EB', true: PURPLE + '70' }}
              thumbColor={prefs.enabled ? PURPLE : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Category toggles */}
        <View style={ns.section}>
          <Text style={ns.sectionTitle}>Kategorije</Text>
          <View style={[ns.card, { flexDirection: 'column', padding: 0, overflow: 'hidden' }]}>
            {CAT_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={opt.id}
                style={[ns.catRow, idx < CAT_OPTIONS.length - 1 && ns.catBorder,
                  !prefs.enabled && ns.catDisabled]}
                onPress={() => prefs.enabled && toggleCategory(opt.id)}
                activeOpacity={prefs.enabled ? 0.7 : 1}
              >
                <View style={[ns.catIcon, { backgroundColor: opt.bg }]}>
                  <Ionicons name={opt.icon as any} size={18} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ns.rowLabel}>{opt.label}</Text>
                  <Text style={ns.rowSub}>{opt.desc}</Text>
                </View>
                <Switch
                  value={prefs.enabled && prefs.categories.includes(opt.id)}
                  onValueChange={() => prefs.enabled && toggleCategory(opt.id)}
                  disabled={!prefs.enabled}
                  trackColor={{ false: '#E5E7EB', true: opt.color + '70' }}
                  thumbColor={prefs.enabled && prefs.categories.includes(opt.id) ? opt.color : '#9CA3AF'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Anti-spam info card */}
        <View style={ns.section}>
          <View style={ns.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#10B981" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={ns.infoTitle}>Bez neželjenih obavještenja</Text>
              <Text style={ns.infoText}>
                • Max. <Text style={ns.infoBold}>2 obavještenja dnevno</Text> po korisniku{'\n'}
                • Nema slanja između <Text style={ns.infoBold}>22:00 – 08:00</Text>{'\n'}
                • Samo sadržaj koji si odabrao/la
              </Text>
            </View>
          </View>
        </View>

        {/* Save button */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity style={ns.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={ns.saveTxt}>Sačuvaj podešavanja</Text></>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const ns = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#111827', marginLeft: 4 },
  permBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 16, padding: 14, backgroundColor: '#FEF3C7',
    borderRadius: 14, borderWidth: 1, borderColor: '#FDE68A',
  },
  permTitle: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#92400E' },
  permSub: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#B45309' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  iconWrap: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  rowLabel: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#111827' },
  rowSub: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#9CA3AF', marginTop: 2 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  catBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  catDisabled: { opacity: 0.4 },
  catIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  infoCard: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: '#F0FDF4', borderRadius: 14, borderWidth: 1, borderColor: '#BBF7D0',
  },
  infoTitle: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#065F46', marginBottom: 6 },
  infoText: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#047857', lineHeight: 20 },
  infoBold: { fontFamily: 'Manrope_700Bold' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 16,
  },
  saveTxt: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#fff' },
});
