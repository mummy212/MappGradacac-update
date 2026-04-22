import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Linking, Alert, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const RED = '#EF4444';
const ORANGE = '#F97316';
const BLUE = '#3B82F6';
const GREEN = '#10B981';
const PURPLE = '#7C3AED';
const YELLOW = '#F59E0B';
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Contact {
  id: string;
  section: string;
  section_emoji: string;
  name: string;
  number: string;
  icon: string;
  color: string;
  bg: string;
  note?: string;
  order: number;
}

// Fallback data if API fails
const FALLBACK_SECTIONS = [
  {
    title: 'Hitni Servisi', emoji: '🚨',
    contacts: [
      { id: '1', section: 'Hitni Servisi', section_emoji: '🚨', name: 'Opći hitni broj', number: '112', icon: 'alert-circle', color: '#fff', bg: RED, note: 'EU standard', order: 0 },
      { id: '2', section: 'Hitni Servisi', section_emoji: '🚨', name: 'Policija', number: '122', icon: 'shield-checkmark', color: RED, bg: '#FEE2E2', order: 1 },
      { id: '3', section: 'Hitni Servisi', section_emoji: '🚨', name: 'Vatrogasci', number: '123', icon: 'flame', color: ORANGE, bg: '#FFF7ED', order: 2 },
      { id: '4', section: 'Hitni Servisi', section_emoji: '🚨', name: 'Hitna pomoć', number: '124', icon: 'medkit', color: GREEN, bg: '#ECFDF5', order: 3 },
    ],
  },
];

function callNumber(number: string) {
  const clean = number.replace(/\s/g, '');
  const url = `tel:${clean}`;
  if (Platform.OS === 'web') { Alert.alert('Poziv', `Pozovite: ${number}`); return; }
  Linking.canOpenURL(url).then(supported => {
    if (supported) Linking.openURL(url);
    else Alert.alert('Greška', `Nije moguće pozvati ${number}`);
  });
}

export default function Emergency() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sections, setSections] = useState<{ title: string; emoji: string; contacts: Contact[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/api/emergency-contacts`);
      const data: Contact[] = await r.json();
      if (Array.isArray(data) && data.length > 0) {
        // Group by section
        const grouped: Record<string, { title: string; emoji: string; contacts: Contact[] }> = {};
        data.sort((a, b) => (a.section === b.section ? a.order - b.order : a.section.localeCompare(b.section)));
        data.forEach(c => {
          if (!grouped[c.section]) {
            grouped[c.section] = { title: c.section, emoji: c.section_emoji || '📞', contacts: [] };
          }
          grouped[c.section].contacts.push(c);
        });
        setSections(Object.values(grouped));
      } else {
        setSections(FALLBACK_SECTIONS);
      }
    } catch {
      setSections(FALLBACK_SECTIONS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchContacts(); setRefreshing(false); }, [fetchContacts]);

  return (
    <View style={[em.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />
      <View style={em.header}>
        <TouchableOpacity style={em.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={em.headerCenter}>
          <Text style={em.headerTitle}>Hitni Brojevi</Text>
          <Text style={em.headerSub}>Gradačac i BiH</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <TouchableOpacity style={em.quickBanner} onPress={() => callNumber('112')} activeOpacity={0.85}>
        <View style={em.quickIcon}><Ionicons name="alert-circle" size={32} color="#fff" /></View>
        <View style={em.quickBody}>
          <Text style={em.quickNum}>112</Text>
          <Text style={em.quickLbl}>Opći hitni broj — tapnite za poziv</Text>
        </View>
        <Ionicons name="call" size={28} color="#fff" />
      </TouchableOpacity>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={RED} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
        >
          {sections.map(sec => (
            <View key={sec.title} style={em.section}>
              <View style={em.secRow}>
                <Text style={em.secEmoji}>{sec.emoji}</Text>
                <Text style={em.secTitle}>{sec.title}</Text>
              </View>
              <View style={em.cards}>
                {sec.contacts.map((c) => (
                  <View key={c.id || c.number} style={[em.card, c.bg === RED && em.cardPrimary]}>
                    <View style={[em.cardIcon, { backgroundColor: c.bg === RED ? 'rgba(255,255,255,0.2)' : c.bg }]}>
                      <Ionicons name={((c.icon || 'call') + '-outline') as any} size={22} color={c.bg === RED ? '#fff' : (c.color === '#fff' ? RED : c.color)} />
                    </View>
                    <View style={em.cardBody}>
                      <Text style={[em.cardName, c.bg === RED && { color: '#fff' }]}>{c.name}</Text>
                      <Text style={[em.cardNum, c.bg === RED && { color: 'rgba(255,255,255,0.85)' }]}>{c.number}</Text>
                      {c.note && <Text style={[em.cardNote, c.bg === RED && { color: 'rgba(255,255,255,0.7)' }]}>{c.note}</Text>}
                    </View>
                    <TouchableOpacity style={[em.callBtn, c.bg === RED && em.callBtnWhite]} onPress={() => callNumber(c.number)} activeOpacity={0.8}>
                      <Ionicons name="call" size={18} color={c.bg === RED ? RED : '#fff'} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ))}
          <View style={em.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={em.infoTxt}>Lokalni brojevi mogu se promijeniti. Za hitne slučajeve uvijek koristite 112.</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const em = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },

  // Header
  header: {
    backgroundColor: RED, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#fff' },
  headerSub: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  // Quick 112 banner
  quickBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: RED, paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)',
    gap: 14,
  },
  quickIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  quickBody: { flex: 1 },
  quickNum: { fontSize: 36, fontFamily: 'Outfit_700Bold', color: '#fff', lineHeight: 40 },
  quickLbl: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  // Section
  section: { marginTop: 20 },
  secRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 20, marginBottom: 10,
  },
  secEmoji: { fontSize: 16 },
  secTitle: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#111827' },

  // Cards
  cards: { marginHorizontal: 16, gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardPrimary: { backgroundColor: RED, borderColor: RED },
  cardIcon: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#111827' },
  cardNum: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: RED, marginTop: 2 },
  cardNote: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: '#9CA3AF', marginTop: 2 },

  // Call button
  callBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center',
  },
  callBtnWhite: { backgroundColor: '#fff' },

  // Info
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    margin: 20, backgroundColor: '#F9FAFB',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  infoTxt: {
    flex: 1, fontSize: 12, fontFamily: 'Manrope_400Regular',
    color: '#6B7280', lineHeight: 18,
  },
});
