import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, Dimensions, StatusBar, Platform, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts, Outfit_700Bold, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import QRCode from 'react-qr-code';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

const C = {
  bg: '#FAF9F6', surface: '#FFF', primary: '#4A5D4E', primaryFg: '#FFF',
  accent: '#D97757', accentFg: '#FFF', text: '#1C1C1C', textSec: '#6B6B6B',
  border: '#E5E4E2', success: '#27AE60',
};

export default function QRScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; offerId?: string; locationId?: string }>();
  const [mode, setMode] = useState<'scan' | 'show'>(params.mode === 'show' ? 'show' : 'scan');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [userName, setUserName] = useState('');
  const [qrData, setQrData] = useState<any>(null);

  const [fontsLoaded] = useFonts({ Outfit_700Bold, Outfit_600SemiBold, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });

  useEffect(() => {
    if (params.offerId && mode === 'show') fetchQRData();
  }, [params.offerId]);

  const fetchQRData = async () => {
    if (params.locationId) {
      try {
        const r = await axios.get(`${BACKEND}/api/locations/${params.locationId}/qr-data`);
        setQrData(r.data);
      } catch {}
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'gradacac_offer') {
        setScanResult(parsed);
      } else if (parsed.type === 'gradacac_location') {
        router.push(`/location/${parsed.locationId}`);
      } else {
        Alert.alert('QR Kod', 'Nepoznat QR kod format');
        setScanned(false);
      }
    } catch {
      Alert.alert('QR Kod', 'Nevalidan QR kod');
      setScanned(false);
    }
  };

  const activateCoupon = async () => {
    if (!userName.trim()) { Alert.alert('Greška', 'Unesite vaše ime'); return; }
    setActivating(true);
    try {
      const r = await axios.post(`${BACKEND}/api/offers/${scanResult.offerId}/activate`, { user_name: userName.trim() });
      setActivated(true);
      setScanResult({ ...scanResult, ...r.data });
    } catch (e: any) {
      Alert.alert('Greška', e.response?.data?.detail || 'Greška pri aktivaciji');
    }
    setActivating(false);
  };

  if (!fontsLoaded) return null;

  return (
    <View testID="qr-screen" style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity testID="back-qr-btn" style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>QR Kod</Text>
        <View style={s.modeToggle}>
          <TouchableOpacity testID="mode-scan" style={[s.modeBtn, mode === 'scan' && s.modeBtnActive]} onPress={() => { setMode('scan'); setScanned(false); setScanResult(null); setActivated(false); }}>
            <Text style={[s.modeTxt, mode === 'scan' && s.modeTxtActive]}>Skeniraj</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="mode-show" style={[s.modeBtn, mode === 'show' && s.modeBtnActive]} onPress={() => setMode('show')}>
            <Text style={[s.modeTxt, mode === 'show' && s.modeTxtActive]}>Prikaži</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SCAN MODE */}
      {mode === 'scan' && !scanResult && (
        <View style={s.scanWrap}>
          {!permission?.granted ? (
            <View style={s.permWrap}>
              <Ionicons name="camera-outline" size={64} color={C.border} />
              <Text style={s.permText}>Potrebna je dozvola za kameru</Text>
              <TouchableOpacity testID="grant-camera-btn" style={s.permBtn} onPress={requestPermission}>
                <Text style={s.permBtnTxt}>Omogući kameru</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.cameraWrap}>
              <CameraView
                testID="qr-camera"
                style={s.camera}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              />
              <View style={s.scanOverlay}>
                <View style={s.scanFrame} />
                <Text style={s.scanHint}>Usmjerite kameru prema QR kodu</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* SCAN RESULT - Activate Coupon */}
      {mode === 'scan' && scanResult && !activated && (
        <ScrollView style={s.resultWrap}>
          <View style={s.resultCard}>
            <View style={s.resultIcon}><Ionicons name="gift-outline" size={40} color={C.accent} /></View>
            <Text style={s.resultTitle}>{scanResult.offerTitle || 'Ponuda'}</Text>
            {scanResult.discount && <Text style={s.resultDiscount}>-{scanResult.discount}%</Text>}
            <Text style={s.resultDesc}>Aktivirajte kupon da ostvarite popust!</Text>
            <Text style={s.fldLbl}>Vaše ime *</Text>
            <TextInput testID="coupon-name-input" style={s.fldInput} value={userName} onChangeText={setUserName} placeholder="Unesite ime" placeholderTextColor={C.textSec} />
            <TouchableOpacity testID="activate-coupon-btn" style={s.activateBtn} onPress={activateCoupon} disabled={activating}>
              {activating ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={s.activateBtnTxt}>Aktiviraj kupon</Text></>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setScanned(false); setScanResult(null); }}>
              <Text style={s.cancelTxt}>Skeniraj ponovo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ACTIVATED */}
      {mode === 'scan' && activated && (
        <View style={s.activatedWrap}>
          <View style={s.activatedCard}>
            <Ionicons name="checkmark-circle" size={80} color={C.success} />
            <Text style={s.activatedTitle}>Kupon aktiviran!</Text>
            <Text style={s.activatedDesc}>Pokažite ovaj ekran osoblju na lokaciji.</Text>
            {scanResult.activation_id && <Text style={s.activationCode}>Kod: {scanResult.activation_id.slice(0, 8).toUpperCase()}</Text>}
            <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
              <Text style={s.doneBtnTxt}>Gotovo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* SHOW MODE - Display QR for location */}
      {mode === 'show' && (
        <ScrollView style={s.showWrap} contentContainerStyle={s.showContent}>
          <Text style={s.showTitle}>QR Kod lokacije</Text>
          <Text style={s.showDesc}>Ovaj QR kod možete istaknuti u radnji. Korisnici ga skeniraju da vide vaš profil i ponude.</Text>
          {qrData ? (
            <>
              <View style={s.qrWrap}>
                <QRCode value={JSON.stringify({ type: 'gradacac_location', locationId: qrData.location_id })} size={200} />
              </View>
              <Text style={s.qrLocName}>{qrData.location_name}</Text>
              {qrData.offers && qrData.offers.length > 0 && (
                <View style={s.qrOffers}>
                  <Text style={s.qrOffersTitle}>QR kodovi za ponude:</Text>
                  {qrData.offers.map((o: any) => (
                    <View key={o.id} style={s.qrOfferItem}>
                      <View style={s.qrSmall}>
                        <QRCode value={JSON.stringify({ type: 'gradacac_offer', offerId: o.id, offerTitle: o.title, discount: o.discount_percent })} size={100} />
                      </View>
                      <View style={s.qrOfferInfo}>
                        <Text style={s.qrOfferName}>{o.title}</Text>
                        {o.discount_percent && <Text style={s.qrOfferDisc}>-{o.discount_percent}%</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={s.noQR}>
              <Ionicons name="qr-code-outline" size={64} color={C.border} />
              <Text style={s.noQRText}>Odaberite lokaciju iz admin panela za generisanje QR koda</Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: 'Outfit_700Bold', color: C.text },
  modeToggle: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  modeBtnActive: { backgroundColor: C.primary },
  modeTxt: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: C.textSec },
  modeTxtActive: { color: '#fff' },
  // Scan
  scanWrap: { flex: 1 },
  permWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  permText: { fontSize: 16, fontFamily: 'Manrope_500Medium', color: C.textSec, marginTop: 16, textAlign: 'center' },
  permBtn: { marginTop: 20, backgroundColor: C.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  permBtnTxt: { color: '#fff', fontSize: 15, fontFamily: 'Manrope_700Bold' },
  cameraWrap: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 3, borderColor: C.accent, borderRadius: 20, backgroundColor: 'transparent' },
  scanHint: { marginTop: 20, fontSize: 14, fontFamily: 'Manrope_500Medium', color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  // Result
  resultWrap: { flex: 1, padding: 24 },
  resultCard: { backgroundColor: C.surface, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  resultIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.accent + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  resultTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: C.text, textAlign: 'center' },
  resultDiscount: { fontSize: 32, fontFamily: 'Outfit_700Bold', color: C.accent, marginTop: 8 },
  resultDesc: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: C.textSec, marginTop: 8, textAlign: 'center' },
  fldLbl: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: C.textSec, textTransform: 'uppercase', marginTop: 20, marginBottom: 6, alignSelf: 'flex-start' },
  fldInput: { width: '100%', backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: 'Manrope_500Medium', color: C.text, borderWidth: 1, borderColor: C.border },
  activateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, width: '100%', marginTop: 20 },
  activateBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold', marginLeft: 8 },
  cancelBtn: { marginTop: 14, padding: 10 },
  cancelTxt: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: C.textSec },
  // Activated
  activatedWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  activatedCard: { backgroundColor: C.surface, borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  activatedTitle: { fontSize: 26, fontFamily: 'Outfit_700Bold', color: C.success, marginTop: 16 },
  activatedDesc: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: C.textSec, marginTop: 8, textAlign: 'center' },
  activationCode: { fontSize: 20, fontFamily: 'Manrope_700Bold', color: C.text, marginTop: 16, backgroundColor: C.bg, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  doneBtn: { marginTop: 24, backgroundColor: C.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  doneBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  // Show
  showWrap: { flex: 1 },
  showContent: { alignItems: 'center', padding: 24 },
  showTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: C.text },
  showDesc: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: C.textSec, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  qrWrap: { backgroundColor: '#fff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  qrLocName: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: C.text, marginTop: 12 },
  qrOffers: { width: '100%', marginTop: 24 },
  qrOffersTitle: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: C.text, marginBottom: 12 },
  qrOfferItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  qrSmall: { backgroundColor: '#fff', padding: 8, borderRadius: 10 },
  qrOfferInfo: { flex: 1, marginLeft: 14 },
  qrOfferName: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: C.text },
  qrOfferDisc: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: C.accent, marginTop: 4 },
  noQR: { alignItems: 'center', paddingVertical: 40 },
  noQRText: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: C.textSec, textAlign: 'center', marginTop: 12 },
});
