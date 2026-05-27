/**
 * Singleton font loader — učitava fontove jednom i kešira i uspjeh i neuspjeh.
 * Sprječava višestruke uncaught promise rejections u Expo Go.
 */
import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import {
  Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium,
} from '@expo-google-fonts/outfit';
import {
  Manrope_400Regular, Manrope_500Medium,
  Manrope_600SemiBold, Manrope_700Bold,
} from '@expo-google-fonts/manrope';

const FONTS = {
  Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium,
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
};

// Globalno stanje — dijeli se između svih komponenti
let attempted = false;
let resolved = false;
const listeners: Array<() => void> = [];

function notify() { listeners.forEach(fn => fn()); }

async function loadOnce() {
  if (attempted) return;
  attempted = true;
  try {
    await Font.loadAsync(FONTS);
  } catch {
    // Fontovi nisu učitani (Expo Go limitation) — app nastavlja sa system fontovima
  }
  resolved = true;
  notify();
}

// Pokrenuti odmah pri importu
loadOnce();

/**
 * Hook koji vraća true kad je font loading pokušan (uspjelo ili ne).
 * Nikad ne ostaje na false zauvijek — ne blokira rendering.
 */
export function useAppFonts(): boolean {
  const [ready, setReady] = useState(resolved);

  useEffect(() => {
    if (resolved) { setReady(true); return; }
    const fn = () => setReady(true);
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }, []);

  return ready;
}
