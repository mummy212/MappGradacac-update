import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PREFS_KEY = 'notif_prefs_v2';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerPushToken() {
  if (Platform.OS === 'web') return;
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
    registerPushToken();
  }, []);

  return (
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
  );
}
