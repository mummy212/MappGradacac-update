import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Linking, StatusBar, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFonts, Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium } from '@expo-google-fonts/outfit';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const colors = {
  background: '#FAF9F6', surface: '#FFFFFF', primary: '#4A5D4E', primaryFg: '#FFFFFF',
  accent: '#D97757', accentFg: '#FFFFFF', textPrimary: '#1C1C1C', textSecondary: '#6B6B6B',
  border: '#E5E4E2', paypal: '#0070BA',
};

const FIXED_AMOUNTS_EUR = [1, 3, 5, 10];
const FIXED_AMOUNTS_BAM = [2, 5, 10, 20];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'BAM'>('EUR');
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [paypalLink, setPaypalLink] = useState('');
  const [contactEmail, setContactEmail] = useState('info@gradacac-mapa.ba');
  // Hidden admin access
  const [tapCount, setTapCount] = useState(0);
  const [showHiddenMenu, setShowHiddenMenu] = useState(false);
  const tapTimer = useRef<any>(null);

  const [fontsLoaded] = useFonts({
    Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
  });

  const amounts = selectedCurrency === 'EUR' ? FIXED_AMOUNTS_EUR : FIXED_AMOUNTS_BAM;
  const symbol = selectedCurrency === 'EUR' ? '€' : 'KM';

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/settings`).then(r => {
      if (r.data.paypal_link) setPaypalLink(r.data.paypal_link);
      if (r.data.contact_email) setContactEmail(r.data.contact_email);
    }).catch(() => {});
  }, []);

  // Hidden gesture: 5 taps on logo
  const handleLogoTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 2000);
    if (newCount >= 5) {
      setTapCount(0);
      setShowHiddenMenu(true);
    }
  };

  const handleDonate = (amount: number) => {
    if (!paypalLink) {
      Alert.alert('PayPal', 'PayPal link još nije podešen. Kontaktirajte administratora.');
      return;
    }
    let url = paypalLink;
    if (!url.startsWith('http')) url = `https://${url}`;
    if (url.includes('paypal.me')) {
      const currencyCode = selectedCurrency === 'EUR' ? 'EUR' : 'BAM';
      url = `${url.replace(/\/$/, '')}/${amount}${currencyCode}`;
    }
    Linking.openURL(url).catch(() => Alert.alert('Greška', 'Nije moguće otvoriti PayPal.'));
  };

  const handleCustomDonate = () => {
    const amount = parseFloat(customAmount);
    if (!amount || amount <= 0) { Alert.alert('Greška', 'Unesite validan iznos'); return; }
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
        {/* App Info - TAPPABLE LOGO for hidden access */}
        <View style={s.appInfo}>
          <TouchableOpacity testID="app-logo-tap" onPress={handleLogoTap} activeOpacity={0.8}>
            <View style={s.appIcon}>
              <Ionicons name="map" size={40} color={colors.primary} />
            </View>
          </TouchableOpacity>
          <Text style={s.appName}>Gradačac Mapa</Text>
          <Text style={s.appVersion}>Verzija 1.0.0</Text>
          <Text style={s.appDesc}>
            Kompletna mapa grada Gradačca sa svim lokacijama, restoranima, marketima, servisima i još mnogo toga. Pronađite sve što vam treba na jednom mjestu.
          </Text>
        </View>

        {/* Hidden Admin Menu */}
        {showHiddenMenu && (
          <View testID="hidden-menu" style={s.hiddenMenu}>
            <Text style={s.hiddenTitle}>Panel pristup</Text>
            <TouchableOpacity testID="hidden-admin-btn" style={s.hiddenBtn} onPress={() => { setShowHiddenMenu(false); router.push('/admin'); }}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              <Text style={s.hiddenBtnTxt}>Admin Panel</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="hidden-biz-btn" style={s.hiddenBtn} onPress={() => { setShowHiddenMenu(false); router.push('/business'); }}>
              <Ionicons name="storefront" size={20} color={colors.accent} />
              <Text style={s.hiddenBtnTxt}>Biznis Panel</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="hidden-close-btn" style={s.hiddenClose} onPress={() => setShowHiddenMenu(false)}>
              <Text style={s.hiddenCloseTxt}>Zatvori</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Features */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Funkcionalnosti</Text>
          <FeatureRow icon="map-outline" text="Interaktivna mapa grada" />
          <FeatureRow icon="search-outline" text="Pretraga lokacija" />
          <FeatureRow icon="star-outline" text="Ocjene i recenzije korisnika" />
          <FeatureRow icon="navigate-outline" text="GPS navigacija do lokacije" />
          <FeatureRow icon="notifications-outline" text="Obavještenja o događajima" />
          <FeatureRow icon="call-outline" text="Direktan poziv lokacije" />
          <FeatureRow icon="qr-code-outline" text="QR skeniranje za popuste" />
          <FeatureRow icon="pricetag-outline" text="Posebne ponude i kuponi" />
        </View>

        {/* Donation Section */}
        <View style={s.donateSection}>
          <View style={s.donateHeader}>
            <Ionicons name="heart" size={28} color={colors.accent} />
            <Text style={s.donateTitle}>Podržite razvoj</Text>
          </View>
          <Text style={s.donateDesc}>
            Ova aplikacija je besplatna za sve korisnike. Vaša donacija pomaže u daljem razvoju i održavanju aplikacije.
          </Text>
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
          <View style={s.amountsRow}>
            {amounts.map(amt => (
              <TouchableOpacity key={amt} testID={`donate-${amt}`}
                style={[s.amountBtn, selectedAmount === amt && s.amountBtnActive]}
                onPress={() => { setSelectedAmount(amt); setCustomAmount(''); }}>
                <Text style={[s.amountText, selectedAmount === amt && s.amountTextActive]}>{amt} {symbol}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.customRow}>
            <View style={s.customInputWrap}>
              <TextInput testID="custom-amount-input" style={s.customInput} value={customAmount}
                onChangeText={(v) => { setCustomAmount(v); setSelectedAmount(null); }}
                placeholder="Drugi iznos" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />
              <Text style={s.customSymbol}>{symbol}</Text>
            </View>
          </View>
          <TouchableOpacity testID="donate-btn" style={s.donateBtn}
            onPress={() => { if (customAmount) handleCustomDonate(); else if (selectedAmount) handleDonate(selectedAmount); else Alert.alert('Odaberite iznos'); }}>
            <Ionicons name="logo-paypal" size={22} color="#fff" />
            <Text style={s.donateBtnText}>Donirajte putem PayPal</Text>
          </TouchableOpacity>
          <Text style={s.secureTxt}>
            <Ionicons name="lock-closed" size={12} color={colors.textSecondary} /> Sigurno plaćanje putem PayPal-a
          </Text>
        </View>

        {/* Privacy Policy (Required for App Store) */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Politika privatnosti</Text>
          <Text style={s.privacyText}>
            Gradačac Mapa poštuje vašu privatnost. Prikupljamo samo podatke neophodne za funkcionisanje aplikacije:
          </Text>
          <View style={s.privacyItem}><Ionicons name="location-outline" size={16} color={colors.primary} /><Text style={s.privacyItemText}>Lokacija: Koristi se samo za prikaz na mapi i ponude u blizini. Ne čuvamo historiju lokacija.</Text></View>
          <View style={s.privacyItem}><Ionicons name="camera-outline" size={16} color={colors.primary} /><Text style={s.privacyItemText}>Kamera: Koristi se isključivo za skeniranje QR kodova.</Text></View>
          <View style={s.privacyItem}><Ionicons name="star-outline" size={16} color={colors.primary} /><Text style={s.privacyItemText}>Recenzije: Ime koje unesete uz recenziju je javno vidljivo.</Text></View>
          <View style={s.privacyItem}><Ionicons name="notifications-outline" size={16} color={colors.primary} /><Text style={s.privacyItemText}>Notifikacije: Možete ih isključiti u postavkama telefona.</Text></View>
          <Text style={s.privacyText}>
            Ne prodajemo niti dijelimo vaše podatke sa trećim stranama. Za više informacija kontaktirajte nas.
          </Text>
        </View>

        {/* Terms of Use (Required for App Store) */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Uslovi korištenja</Text>
          <Text style={s.privacyText}>
            Korištenjem ove aplikacije prihvatate sljedeće uslove: Aplikacija je besplatna za korištenje. Sadržaj (recenzije, poruke) ne smije biti uvredljiv ili neprimjeren. Zadržavamo pravo uklanjanja neprimjerenog sadržaja. Informacije o lokacijama su informativnog karaktera.
          </Text>
        </View>

        {/* Report Content (Required for App Store UGC) */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Prijavi neprimjeren sadržaj</Text>
          <Text style={s.privacyText}>
            Ako primijetite neprimjeren sadržaj (recenziju, poruku ili ponudu), molimo prijavite putem emaila:
          </Text>
          <TouchableOpacity testID="report-content-btn" style={s.reportBtn} onPress={() => Linking.openURL(`mailto:${contactEmail}?subject=Prijava neprimjerenog sadržaja`)}>
            <Ionicons name="flag-outline" size={18} color={colors.accent} />
            <Text style={s.reportBtnTxt}>Prijavi sadržaj</Text>
          </TouchableOpacity>
        </View>

        {/* Contact */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Kontakt</Text>
          <TouchableOpacity style={s.contactRow} onPress={() => Linking.openURL(`mailto:${contactEmail}`)}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={s.contactText}>{contactEmail}</Text>
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
  appInfo: { alignItems: 'center', paddingVertical: 28 },
  appIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  appName: { fontSize: 26, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, letterSpacing: -0.8 },
  appVersion: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: colors.textSecondary, marginTop: 4 },
  appDesc: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  // Hidden menu
  hiddenMenu: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  hiddenTitle: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  hiddenBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  hiddenBtnTxt: { fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: colors.textPrimary, marginLeft: 12 },
  hiddenClose: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  hiddenCloseTxt: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: colors.textSecondary },
  // Sections
  section: { marginTop: 8, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, marginBottom: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  featureText: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, marginLeft: 12 },
  // Donate
  donateSection: { marginTop: 8, paddingTop: 20, paddingBottom: 20, borderTopWidth: 1, borderTopColor: colors.border },
  donateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  donateTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, marginLeft: 10 },
  donateDesc: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, lineHeight: 22, marginBottom: 18 },
  currencyToggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 14 },
  currencyBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  currencyBtnActive: { backgroundColor: colors.primary },
  currencyText: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: colors.textPrimary },
  currencyTextActive: { color: '#fff' },
  amountsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  amountBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  amountBtnActive: { borderColor: colors.accent, backgroundColor: '#FFF5F0' },
  amountText: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: colors.textPrimary },
  amountTextActive: { color: colors.accent },
  customRow: { marginBottom: 18 },
  customInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 },
  customInput: { flex: 1, fontSize: 16, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, paddingVertical: Platform.OS === 'ios' ? 14 : 10 },
  customSymbol: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: colors.textSecondary },
  donateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paypal, borderRadius: 14, paddingVertical: 16, marginBottom: 10 },
  donateBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold', marginLeft: 10 },
  secureTxt: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, textAlign: 'center' },
  // Privacy
  privacyText: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, lineHeight: 22, marginBottom: 12 },
  privacyItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, paddingLeft: 4 },
  privacyItemText: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, marginLeft: 10, flex: 1, lineHeight: 20 },
  // Report
  reportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent + '0C', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.accent + '20' },
  reportBtnTxt: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: colors.accent, marginLeft: 8 },
  // Contact
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  contactText: { fontSize: 15, fontFamily: 'Manrope_500Medium', color: colors.primary, marginLeft: 12 },
  footer: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: colors.border, textAlign: 'center', marginTop: 28 },
});
