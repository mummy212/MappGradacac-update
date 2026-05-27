import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import HomeTab from '../components/HomeTab';
import MapTab from '../components/MapTab';
import EventsTab from '../components/EventsTab';
import ReservationsTab from '../components/ReservationsTab';
import FavoritesTab from '../components/FavoritesTab';
import ProfileTab from '../components/ProfileTab';
import { useLanguage } from '../context/LanguageContext';

const PURPLE = '#7C3AED';
const GRAY = '#9CA3AF';

export default function Index() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('home');
  const [mapCategory, setMapCategory] = useState('');
  const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
  });

  useEffect(() => { getGPS(); }, []);

  const getGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const l = await Location.getCurrentPositionAsync({});
        setUserLoc({ latitude: l.coords.latitude, longitude: l.coords.longitude });
      }
    } catch {}
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key !== 'mapa') setMapCategory('');
  };

  if (!fontsLoaded && !fontError) {
    return (
      <View style={s.loadWrap}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="map" size={48} color={PURPLE} />
        <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 20 }} />
        <Text style={s.loadText}>{t('common', 'loading')}</Text>
      </View>
    );
  }

  const TABS = [
    { key: 'home',        label: t('tabs', 'home'),      icon: 'home-outline',     iconActive: 'home' },
    { key: 'mapa',        label: t('tabs', 'map'),       icon: 'map-outline',      iconActive: 'map' },
    { key: 'rezervacije', label: t('tabs', 'events'),    icon: 'calendar-outline', iconActive: 'calendar' },
    { key: 'favoriti',    label: t('tabs', 'favorites'), icon: 'heart-outline',    iconActive: 'heart' },
    { key: 'profil',      label: t('tabs', 'profile'),   icon: 'person-outline',   iconActive: 'person' },
  ] as const;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      <View style={s.content}>
        {activeTab === 'home' && (
          <HomeTab
            userLoc={userLoc}
            setActiveTab={handleTabChange}
            setMapCategory={setMapCategory}
          />
        )}
        {activeTab === 'mapa' && (
          <MapTab
            userLoc={userLoc}
            filterCategory={mapCategory}
            onCategoryChange={setMapCategory}
          />
        )}
        {activeTab === 'rezervacije' && <ReservationsTab />}
        {activeTab === 'favoriti' && <FavoritesTab userLoc={userLoc} />}
        {activeTab === 'profil' && <ProfileTab />}
      </View>

      {/* Bottom Tab Bar */}
      <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom - 4, 4) }]}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              testID={`tab-${tab.key}`}
              style={s.tabItem}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(active ? tab.iconActive : tab.icon) as any}
                size={24}
                color={active ? PURPLE : GRAY}
              />
              <Text style={[s.tabLabel, { color: active ? PURPLE : GRAY }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  loadWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6FA',
  },
  loadText: { marginTop: 16, fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#111827' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingBottom: 4,
  },
  tabLabel: { fontSize: 10, fontFamily: 'Manrope_600SemiBold' },
});
