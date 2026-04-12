import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Linking, StatusBar, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFonts, Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium } from '@expo-google-fonts/outfit';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';

const colors = {
  background: '#FAF9F6', surface: '#FFFFFF', primary: '#4A5D4E', primaryFg: '#FFFFFF',
  accent: '#D97757', accentFg: '#FFFFFF', textPrimary: '#1C1C1C', textSecondary: '#6B6B6B',
  border: '#E5E4E2', paypal: '#0070BA',
};

// ⚠️ ZAMIJENI sa svojim PayPal.me linkom ili PayPal email adresom
const PAYPAL_ME_USERNAME = 'GradacacMapa';
// Alternativno, koristi PayPal email: const PAYPAL_EMAIL = 'tvoj@email.com';

const FIXED_AMOUNTS_EUR = [1, 3, 5, 10];
const FIXED_AMOUNTS_BAM = [2, 5, 10, 20];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'BAM'>('EUR');
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const [fontsLoaded] = useFonts({
    Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
  });

  const amounts = selectedCurrency === 'EUR' ? FIXED_AMOUNTS_EUR : FIXED_AMOUNTS_BAM;
  const symbol = selectedCurrency === 'EUR' ? '€' : 'KM';

  const handleDonate = (amount: number) => {
    const currencyCode = selectedCurrency === 'EUR' ? 'EUR' : 'BAM';
    // PayPal.me link format
    const url = `https://www.paypal.me/${PAYPAL_ME_USERNAME}/${amount}${currencyCode}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Greška', 'Nije moguće otvoriti PayPal. Provjerite da li imate instaliran browser.');
    });
  };

  const handleCustomDonate = () => {
    const amount = parseFloat(customAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Greška', 'Unesite validan iznos');
      return;
    }
    handleDonate(amount);
  };

  if (!fontsLoaded) return null;

  return (
    <View testID="about-screen" style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity testID="back-about-btn" style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>O aplikaciji</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* App Info */}
        <View style={s.appInfo}>
          <View style={s.appIcon}>
            <Ionicons name="map" size={40} color={colors.primary} />
          </View>
          <Text style={s.appName}>Gradačac Mapa</Text>
          <Text style={s.appVersion}>Verzija 1.0.0</Text>
          <Text style={s.appDesc}>
            Kompletna mapa grada Gradačca sa svim lokacijama, restoranima, marketima, servisima i još mnogo toga. Pronađite sve što vam treba na jednom mjestu.
          </Text>
        </View>

        {/* Features */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Funkcionalnosti</Text>
          <FeatureRow icon="map-outline" text="Interaktivna mapa grada" />
          <FeatureRow icon="search-outline" text="Pretraga lokacija" />
          <FeatureRow icon="star-outline" text="Ocjene i recenzije korisnika" />
          <FeatureRow icon="navigate-outline" text="GPS navigacija do lokacije" />
          <FeatureRow icon="notifications-outline" text="Obavještenja o događajima" />
          <FeatureRow icon="call-outline" text="Direktan poziv lokacije" />
        </View>

        {/* Donation Section */}
        <View style={s.donateSection}>
          <View style={s.donateHeader}>
            <Ionicons name="heart" size={28} color={colors.accent} />
            <Text style={s.donateTitle}>Podržite razvoj</Text>
          </View>
          <Text style={s.donateDesc}>
            Ova aplikacija je besplatna za sve korisnike. Vaša donacija pomaže u daljem razvoju i održavanju aplikacije. Svaki iznos je dobrodošao!
          </Text>

          {/* Currency Toggle */}
          <View style={s.currencyToggle}>
            <TouchableOpacity testID="currency-eur" style={[s.currencyBtn, selectedCurrency === 'EUR' && s.currencyBtnActive]}
              onPress={() => { setSelectedCurrency('EUR'); setSelectedAmount(null); setCustomAmount(''); }}>
              <Text style={[s.currencyText, selectedCurrency === 'EUR' && s.currencyTextActive]}>EUR (€)</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="currency-bam" style={[s.currencyBtn, selectedCurrency === 'BAM' && s.currencyBtnActive]}
              onPress={() => { setSelectedCurrency('BAM'); setSelectedAmount(null); setCustomAmount(''); }}>
              <Text style={[s.currencyText, selectedCurrency === 'BAM' && s.currencyTextActive]}>BAM (KM)</Text>
            </TouchableOpacity>
          </View>

          {/* Fixed Amounts */}
          <View style={s.amountsRow}>
            {amounts.map(amt => (
              <TouchableOpacity key={amt} testID={`donate-${amt}`}
                style={[s.amountBtn, selectedAmount === amt && s.amountBtnActive]}
                onPress={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                activeOpacity={0.7}>
                <Text style={[s.amountText, selectedAmount === amt && s.amountTextActive]}>
                  {amt} {symbol}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount */}
          <View style={s.customRow}>
            <View style={s.customInputWrap}>
              <TextInput testID="custom-amount-input" style={s.customInput} value={customAmount}
                onChangeText={(v) => { setCustomAmount(v); setSelectedAmount(null); }}
                placeholder="Drugi iznos" placeholderTextColor={colors.textSecondary}
                keyboardType="numeric" />
              <Text style={s.customSymbol}>{symbol}</Text>
            </View>
          </View>

          {/* Donate Button */}
          <TouchableOpacity testID="donate-btn" style={s.donateBtn}
            onPress={() => {
              if (customAmount) handleCustomDonate();
              else if (selectedAmount) handleDonate(selectedAmount);
              else Alert.alert('Odaberite iznos', 'Molimo odaberite ili unesite iznos donacije');
            }}
            activeOpacity={0.7}>
            <Ionicons name="logo-paypal" size={22} color="#fff" />
            <Text style={s.donateBtnText}>Donirajte putem PayPal</Text>
          </TouchableOpacity>

          <Text style={s.secureTxt}>
            <Ionicons name="lock-closed" size={12} color={colors.textSecondary} /> Sigurno plaćanje putem PayPal-a
          </Text>
        </View>

        {/* Contact */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Kontakt</Text>
          <TouchableOpacity style={s.contactRow} onPress={() => Linking.openURL('mailto:info@gradacac-mapa.ba')}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={s.contactText}>info@gradacac-mapa.ba</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>© 2026 Gradačac Mapa. Sva prava zadržana.</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={s.featureRow}>
      <View style={s.featureIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View>
      <Text style={s.featureText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: colors.textPrimary },
  scroll: { paddingHorizontal: 24 },
  // App info
  appInfo: { alignItems: 'center', paddingVertical: 32 },
  appIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  appName: { fontSize: 26, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, letterSpacing: -0.8 },
  appVersion: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: colors.textSecondary, marginTop: 4 },
  appDesc: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  // Sections
  section: { marginTop: 8, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, marginBottom: 16 },
  // Features
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featureIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  featureText: { fontSize: 15, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, marginLeft: 14 },
  // Donate
  donateSection: { marginTop: 8, paddingTop: 24, paddingBottom: 24, borderTopWidth: 1, borderTopColor: colors.border },
  donateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  donateTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, marginLeft: 10 },
  donateDesc: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, lineHeight: 22, marginBottom: 20 },
  // Currency toggle
  currencyToggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 },
  currencyBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  currencyBtnActive: { backgroundColor: colors.primary },
  currencyText: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: colors.textPrimary },
  currencyTextActive: { color: '#fff' },
  // Amounts
  amountsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  amountBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  amountBtnActive: { borderColor: colors.accent, backgroundColor: '#FFF5F0' },
  amountText: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: colors.textPrimary },
  amountTextActive: { color: colors.accent },
  // Custom
  customRow: { marginBottom: 20 },
  customInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 },
  customInput: { flex: 1, fontSize: 16, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, paddingVertical: Platform.OS === 'ios' ? 14 : 10 },
  customSymbol: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: colors.textSecondary },
  // Donate button
  donateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paypal, borderRadius: 14, paddingVertical: 18, marginBottom: 12 },
  donateBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold', marginLeft: 10 },
  secureTxt: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, textAlign: 'center' },
  // Contact
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  contactText: { fontSize: 15, fontFamily: 'Manrope_500Medium', color: colors.primary, marginLeft: 12 },
  // Footer
  footer: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: colors.border, textAlign: 'center', marginTop: 32 },
});
