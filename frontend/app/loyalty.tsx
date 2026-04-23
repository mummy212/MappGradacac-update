import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, TextInput, Alert, ActivityIndicator, Modal, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';

const PURPLE = '#7C3AED';
const GREEN = '#10B981';
const GOLD = '#F59E0B';
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const LOYALTY_NAME_KEY = 'gradacac_loyalty_name';
const TOTAL_STAMPS = 10;

interface LoyaltyData {
  user_name: string;
  points: number;
  total_visits: number;
  visits: { location_id: string; location_name: string; date: string }[];
}

export default function LoyaltyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useLanguage();
  const [userName, setUserName] = useState('');
  const [inputName, setInputName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUserName = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(LOYALTY_NAME_KEY);
      if (saved) {
        setUserName(saved);
        return saved;
      }
    } catch {}
    return null;
  }, []);

  const fetchLoyalty = useCallback(async (name: string) => {
    if (!name) return;
    try {
      const r = await fetch(`${BACKEND}/api/loyalty/${encodeURIComponent(name)}`);
      const data = await r.json();
      setLoyalty(data);
    } catch {
      setLoyalty({ user_name: name, points: 0, total_visits: 0, visits: [] });
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    const name = await loadUserName();
    if (name) {
      await fetchLoyalty(name);
    } else {
      setShowNameModal(true);
    }
    setLoading(false);
  }, [loadUserName, fetchLoyalty]);

  useEffect(() => { init(); }, [init]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userName) await fetchLoyalty(userName);
    setRefreshing(false);
  }, [userName, fetchLoyalty]);

  const saveName = async () => {
    const trimmed = inputName.trim();
    if (!trimmed || trimmed.length < 2) { Alert.alert(t('common','error'), t('loyalty','nameErrorMsg')); return; }
    await AsyncStorage.setItem(LOYALTY_NAME_KEY, trimmed);
    setUserName(trimmed);
    setShowNameModal(false);
    setLoading(true);
    await fetchLoyalty(trimmed);
    setLoading(false);
  };

  const stamps = loyalty ? Math.min(loyalty.total_visits, TOTAL_STAMPS) : 0;
  const progress = stamps / TOTAL_STAMPS;
  const isComplete = stamps >= TOTAL_STAMPS;

  const formatDate = (dt: string) => {
    try {
      return new Date(dt).toLocaleDateString('bs-BA', { day: 'numeric', month: 'short' });
    } catch { return dt; }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{t('loyalty', 'header')}</Text>
          <Text style={s.headerSub}>{t('loyalty', 'headerSub')}</Text>
        </View>
        <TouchableOpacity style={s.changeBtn} onPress={() => { setInputName(userName); setShowNameModal(true); }}>
          <Ionicons name="person-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadWrap}><ActivityIndicator color={PURPLE} size="large" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
        >
          {/* User Card */}
          <View style={s.userCard}>
            <View style={s.userAvatar}>
              <Text style={s.userAvatarTxt}>{(userName || 'G')[0].toUpperCase()}</Text>
            </View>
            <View style={s.userInfo}>
              <Text style={s.userName}>{userName}</Text>
              <Text style={s.userSub}>
                {loyalty?.total_visits || 0} {language === 'bs' ? 'posjeta' : 'visits'} · {loyalty?.points || 0} {language === 'bs' ? 'bodova' : 'points'}
              </Text>
            </View>
            {isComplete && (
              <View style={s.completeBadge}>
                <Text style={s.completeTxt}>{t('loyalty', 'reward')}</Text>
              </View>
            )}
          </View>

          {/* Stamp Card */}
          <View style={s.cardWrap}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{t('loyalty', 'cardTitle')}</Text>
              <Text style={s.cardSub}>{stamps}/{TOTAL_STAMPS} {language === 'bs' ? 'pečata' : 'stamps'}</Text>
            </View>

            {/* Stamp Grid */}
            <View style={s.stampGrid}>
              {Array.from({ length: TOTAL_STAMPS }).map((_, i) => {
                const filled = i < stamps;
                return (
                  <View key={i} style={[s.stamp, filled && s.stampFilled]}>
                    {filled ? (
                      <Ionicons name="checkmark-circle" size={28} color={GOLD} />
                    ) : (
                      <View style={s.stampEmpty}>
                        <Text style={s.stampNum}>{i + 1}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Progress Bar */}
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
            <Text style={s.progressTxt}>
              {isComplete
                ? t('loyalty', 'progressComplete')
                : `${language === 'bs' ? 'Još' : 'Only'} ${TOTAL_STAMPS - stamps} ${language === 'bs' ? 'posjeta do nagrade' : 'more visits to reward'}`}
            </Text>
          </View>

          {/* How It Works */}
          <View style={s.howCard}>
            <Text style={s.howTitle}>{t('loyalty', 'howTitle')}</Text>
            <View style={s.howRow}>
              <View style={s.howIcon}><Ionicons name="qr-code-outline" size={22} color={PURPLE} /></View>
              <View style={s.howBody}>
                <Text style={s.howStep}>{t('loyalty', 'step1Title')}</Text>
                <Text style={s.howDesc}>{t('loyalty', 'step1Desc')}</Text>
              </View>
            </View>
            <View style={s.howRow}>
              <View style={s.howIcon}><Ionicons name="star-outline" size={22} color={GOLD} /></View>
              <View style={s.howBody}>
                <Text style={s.howStep}>{t('loyalty', 'step2Title')}</Text>
                <Text style={s.howDesc}>{t('loyalty', 'step2Desc')}</Text>
              </View>
            </View>
            <View style={s.howRow}>
              <View style={s.howIcon}><Ionicons name="gift-outline" size={22} color={GREEN} /></View>
              <View style={s.howBody}>
                <Text style={s.howStep}>{t('loyalty', 'step3Title')}</Text>
                <Text style={s.howDesc}>{t('loyalty', 'step3Desc')}</Text>
              </View>
            </View>
          </View>

          {/* Recent Visits */}
          {loyalty && loyalty.visits && loyalty.visits.length > 0 && (
            <View style={s.visitsWrap}>
              <Text style={s.visitTitle}>{t('loyalty', 'visitsTitle')}</Text>
              {loyalty.visits.slice(-5).reverse().map((v, i) => (
                <View key={i} style={s.visitRow}>
                  <View style={s.visitIcon}>
                    <Ionicons name="location-outline" size={18} color={PURPLE} />
                  </View>
                  <View style={s.visitBody}>
                    <Text style={s.visitName}>{v.location_name}</Text>
                    <Text style={s.visitDate}>{formatDate(v.date)}</Text>
                  </View>
                  <Text style={s.visitPts}>+10 pts</Text>
                </View>
              ))}
            </View>
          )}

          {/* QR CTA */}
          <TouchableOpacity style={s.qrCta} onPress={() => router.push('/qr')}>
            <Ionicons name="qr-code" size={28} color={PURPLE} />
            <View style={s.qrCtaText}>
              <Text style={s.qrCtaTitle}>{t('loyalty', 'qrTitle')}</Text>
              <Text style={s.qrCtaSub}>{t('loyalty', 'qrSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={PURPLE} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Name Input Modal */}
      <Modal visible={showNameModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}>
              <Ionicons name="person-add-outline" size={36} color={PURPLE} />
            </View>
            <Text style={s.modalTitle}>{t('loyalty', 'modalTitle')}</Text>
            <Text style={s.modalDesc}>{t('loyalty', 'modalDesc')}</Text>
            <TextInput
              style={s.modalInput}
              value={inputName}
              onChangeText={setInputName}
              placeholder={t('loyalty', 'modalPlaceholder')}
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <TouchableOpacity style={s.modalBtn} onPress={saveName}>
              <Text style={s.modalBtnTxt}>{t('common', 'confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    backgroundColor: PURPLE, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#fff' },
  headerSub: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  changeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // User Card
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  userAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: PURPLE, justifyContent: 'center', alignItems: 'center' },
  userAvatarTxt: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#111827' },
  userSub: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: '#6B7280', marginTop: 2 },
  completeBadge: { backgroundColor: GOLD + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: GOLD + '50' },
  completeTxt: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: GOLD },
  // Stamp Card
  cardWrap: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#111827' },
  cardSub: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: PURPLE },
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 16 },
  stamp: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  stampFilled: { backgroundColor: GOLD + '15', borderColor: GOLD + '50' },
  stampEmpty: { width: 36, height: 36, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' },
  stampNum: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#D1D5DB' },
  progressBg: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 8, backgroundColor: PURPLE, borderRadius: 4 },
  progressTxt: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: '#6B7280', textAlign: 'center' },
  // How It Works
  howCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  howTitle: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#111827', marginBottom: 16 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  howIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: PURPLE + '10', justifyContent: 'center', alignItems: 'center' },
  howBody: { flex: 1 },
  howStep: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#111827' },
  howDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#6B7280', marginTop: 1 },
  // Visits
  visitsWrap: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  visitTitle: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#111827', marginBottom: 12 },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  visitIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: PURPLE + '10', justifyContent: 'center', alignItems: 'center' },
  visitBody: { flex: 1 },
  visitName: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#111827' },
  visitDate: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: '#9CA3AF', marginTop: 1 },
  visitPts: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: GREEN },
  // QR CTA
  qrCta: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: PURPLE + '10', borderRadius: 18, padding: 16, gap: 14, borderWidth: 1, borderColor: PURPLE + '25' },
  qrCtaText: { flex: 1 },
  qrCtaTitle: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#111827' },
  qrCtaSub: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#6B7280', marginTop: 2 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center' },
  modalIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: PURPLE + '12', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#111827', marginBottom: 8 },
  modalDesc: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'Manrope_500Medium', color: '#111827', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  modalBtn: { width: '100%', backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  modalBtnTxt: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: '#fff' },
});
