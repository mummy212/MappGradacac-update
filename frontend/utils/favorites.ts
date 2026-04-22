import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gradacac_favorites';

export async function getFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function toggleFavorite(id: string): Promise<boolean> {
  try {
    const favs = await getFavorites();
    const isFav = favs.includes(id);
    const next = isFav ? favs.filter(x => x !== id) : [...favs, id];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return !isFav;
  } catch { return false; }
}

export async function isFavorite(id: string): Promise<boolean> {
  const favs = await getFavorites();
  return favs.includes(id);
}
