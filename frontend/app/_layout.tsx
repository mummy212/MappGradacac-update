import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform, LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Font from 'expo-font';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageProvider } from '../context/LanguageContext';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PREFS_KEY = 'notif_prefs_v2';

const isExpoGo = Constants.appOwnership === 'expo';

// Potisni poznate greške koje su kozmetičke (ne utiču na funkcionalnost)
LogBox.ignoreLogs([
  'Font file for ionicons is empty',
  'ExpoFontLoader.loadAsync',
  'shadow* style props are deprecated',
  'Listening to push token changes',
  'VirtualizedLists should never be nested',
]);

// Configure notification handler samo van Expo Go
if (!isExpoGo) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {}
}

// Preloadaj sve icon fontove jednom sa error handlerom
// da se izbjegnu višestruke uncaught rejection greške
async function preloadIconFonts() {
  try {
    await Promise.all([
      Font.loadAsync(Ionicons.font),
      Font.loadAsync(MaterialIcons.font),
      Font.loadAsync(FontAwesome5.font),
    ]);
  } catch {
    // Font file nedostupan (Expo Go limitation) — ikonice će biti nevidljive
    // App funkcioniše normalno
  }
}

async function registerPushToken() {
  if (Platform.OS === 'web' || isExpoGo) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    if (!token) return;
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : { enabled: true, categories: ['news', 'events', 'offers'] };
    await fetch(`${BACKEND}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        categories: prefs.categories,
        enabled: prefs.enabled,
      }),
    });
  } catch {}
}

export default function Layout() {
  useEffect(() => {
    preloadIconFonts();
    registerPushToken();
  }, []);

  return (
    <LanguageProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="business" />
      <Stack.Screen name="about" />
      <Stack.Screen name="qr" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="notification-settings" />
      <Stack.Screen name="location/[id]" />
      <Stack.Screen name="attraction/[id]" />
    </Stack>
    </LanguageProvider>
  );
}
