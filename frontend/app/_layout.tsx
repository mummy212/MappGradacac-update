import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="business" />
      <Stack.Screen name="about" />
      <Stack.Screen name="qr" />
      <Stack.Screen name="location/[id]" />
      <Stack.Screen name="attraction/[id]" />
    </Stack>
  );
}
