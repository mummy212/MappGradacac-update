import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';

const PURPLE = '#7C3AED';
const FAV_KEY = 'gradacac_favorites';

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [favCount, setFavCount] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(FAV_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setFavCount(ids.length);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogoTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 2000);
    if (next >= 5) {
      setTapCount(0);
      Alert.alert(t('profile', 'panelTitle'), t('profile', 'panelPrompt'), [
        { text: t('profile', 'adminPanel'), onPress: () => router.push('/admin') },
        { text: t('profile', 'businessPanel'), onPress: () => router.push('/business') },
        { text: t('common', 'close'), style: 'cancel' },
      ]);
    }
  };

  const menuItems = [
    {
      icon: 'call' as const,
      label: t('profile', 'menuEmergencyLabel'),
      desc: t('profile', 'menuEmergencyDesc'),
      color: '#EF4444',
      action: () => router.push('/emergency'),
    },
    {
      icon: 'star-outline' as const,
      label: t('profile', 'menuLoyaltyLabel'),
      desc: t('profile', 'menuLoyaltyDesc'),
      color: '#F59E0B',
      action: () => router.push('/loyalty'),
    },
    {
      icon: 'heart-outline' as const,
      label: t('profile', 'menuFavoritesLabel'),
      desc: `${favCount} ${language === 'bs' ? 'sačuvano' : 'saved'}`,
      color: '#EF4444',
      action: () => {},
    },
    {
      icon: 'notifications-outline' as const,
      label: t('profile', 'menuNotifLabel'),
      desc: t('profile', 'menuNotifDesc'),
      color: PURPLE,
      action: () => router.push('/notification-settings'),
    },
    {
      icon: 'qr-code-outline' as const,
      label: t('profile', 'menuQrLabel'),
      desc: t('profile', 'menuQrDesc'),
      color: PURPLE,
      action: () => router.push('/qr'),
    },
    {
      icon: 'information-circle-outline' as const,
      label: t('profile', 'menuAboutLabel'),
      desc: t('profile', 'menuAboutDesc'),
      color: '#10B981',
      action: () => router.push('/about'),
    },
  ];

  return (
    <View style={[pt.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={pt.header}>
        <Text style={pt.headerTitle}>{t('profile', 'header')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* App branding with 5-tap Easter egg */}
        <TouchableOpacity style={pt.brandCard} onPress={handleLogoTap} activeOpacity={0.85}>
          <View style={pt.logoCircle}>
            <Ionicons name="map" size={42} color={PURPLE} />
          </View>
          <Text style={pt.brandName}>{t('profile', 'brandName')}</Text>
          <Text style={pt.brandSub}>{t('profile', 'brandSub')}</Text>
        </TouchableOpacity>

        {/* Stats row */}
        <View style={pt.statsRow}>
          <View style={pt.statCard}>
            <Ionicons name="heart" size={22} color="#EF4444" />
            <Text style={pt.statNum}>{favCount}</Text>
            <Text style={pt.statLbl}>{t('profile', 'statFavorites')}</Text>
          </View>
          <View style={[pt.statCard, pt.statBorder]}>
            <Ionicons name="qr-code" size={22} color={PURPLE} />
            <Text style={pt.statNum}>QR</Text>
            <Text style={pt.statLbl}>{t('profile', 'statScanner')}</Text>
          </View>
          <View style={pt.statCard}>
            <Ionicons name="location" size={22} color="#10B981" />
            <Text style={pt.statNum}>GPS</Text>
            <Text style={pt.statLbl}>{t('profile', 'statNavigation')}</Text>
          </View>
        </View>

        {/* Language Toggle */}
        <View style={pt.langCard}>
          <View style={pt.langLeft}>
            <View style={[pt.menuIcon, { backgroundColor: '#4A90D915' }]}>
              <Ionicons name="language-outline" size={22} color="#4A90D9" />
            </View>
            <View style={pt.menuBody}>
              <Text style={pt.menuLabel}>{t('profile', 'menuLanguageLabel')}</Text>
              <Text style={pt.menuDesc}>{t('profile', 'menuLanguageDesc')}</Text>
            </View>
          </View>
          <View style={pt.langToggle}>
            <TouchableOpacity
              style={[pt.langBtn, language === 'bs' && pt.langBtnActive]}
              onPress={() => setLanguage('bs')}
            >
              <Text style={[pt.langBtnTxt, language === 'bs' && pt.langBtnTxtActive]}>BS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[pt.langBtn, language === 'en' && pt.langBtnActive]}
              onPress={() => setLanguage('en')}
            >
              <Text style={[pt.langBtnTxt, language === 'en' && pt.langBtnTxtActive]}>EN</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu items */}
        <View style={pt.menuSection}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[pt.menuItem, idx < menuItems.length - 1 && pt.menuBorder]}
              onPress={item.action}
              activeOpacity={0.7}
            >
              <View style={[pt.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={pt.menuBody}>
                <Text style={pt.menuLabel}>{item.label}</Text>
                <Text style={pt.menuDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={pt.version}>{t('profile', 'version')}</Text>
        <Text style={pt.versionSub}>{t('profile', 'copyright')}</Text>
      </ScrollView>
    </View>
  );
}

const pt = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#111827' },
  brandCard: {
    alignItems: 'center', padding: 32, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  logoCircle: {
    width: 84, height: 84, borderRadius: 26, backgroundColor: PURPLE + '12',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  brandName: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: '#111827' },
  brandSub: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: '#6B7280', marginTop: 4 },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 12 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 20, gap: 5 },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F3F4F6' },
  statNum: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#111827' },
  statLbl: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: '#9CA3AF' },
  langCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12, padding: 14,
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  langLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  langToggle: { flexDirection: 'row', gap: 6 },
  langBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  langBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  langBtnTxt: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#9CA3AF' },
  langBtnTxtActive: { color: '#fff' },
  menuSection: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#111827' },
  menuDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#9CA3AF', marginTop: 2 },
  version: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: '#9CA3AF', textAlign: 'center', marginTop: 28 },
  versionSub: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: '#D1D5DB', textAlign: 'center', marginTop: 4 },
});

