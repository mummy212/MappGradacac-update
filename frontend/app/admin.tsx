import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert,
  ActivityIndicator, Modal, Dimensions, Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFonts, Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium } from '@expo-google-fonts/outfit';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web-safe storage wrapper
const Storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      }
      return await AsyncStorage.getItem(key);
    } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        typeof window !== 'undefined' && window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        typeof window !== 'undefined' && window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const colors = {
  background: '#FAF9F6', surface: '#FFFFFF', primary: '#4A5D4E', primaryFg: '#FFFFFF',
  accent: '#D97757', accentFg: '#FFFFFF', textPrimary: '#1C1C1C', textSecondary: '#6B6B6B',
  border: '#E5E4E2', danger: '#E74C3C', success: '#27AE60',
};

const CATEGORIES = [
  { id: 'restaurant', name: 'Restorani' }, { id: 'market', name: 'Marketi' },
  { id: 'auto_service', name: 'Auto Servisi' }, { id: 'cafe', name: 'Kafići' },
  { id: 'pharmacy', name: 'Ljekarne' }, { id: 'gas_station', name: 'Benzinske' },
];

interface LocationItem {
  id: string; name: string; category: string; address: string;
  latitude: number; longitude: number; phone?: string;
  description?: string; working_hours?: string; is_premium?: boolean;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLocation, setEditLocation] = useState<Partial<LocationItem>>({});
  const [isNewLocation, setIsNewLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paypalLink, setPaypalLink] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [fontsLoaded] = useFonts({
    Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
  });

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const savedToken = await Storage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      fetchLocations(savedToken);
      fetchSettings(savedToken);
    }
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const r = await axios.post(`${BACKEND_URL}/api/auth/login`, { email: email.toLowerCase(), password });
      const t = r.data.token;
      setToken(t);
      await Storage.setItem('admin_token', t);
      setIsLoggedIn(true);
      fetchLocations(t);
      fetchSettings(t);
    } catch (e: any) {
      setLoginError(e.response?.data?.detail || 'Greška pri prijavi');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await Storage.removeItem('admin_token');
    setIsLoggedIn(false);
    setToken('');
    setEmail('');
    setPassword('');
  };

  const fetchLocations = async (t: string) => {
    setLoading(true);
    try {
      const r = await axios.get(`${BACKEND_URL}/api/locations`, { headers: { Authorization: `Bearer ${t}` } });
      setLocations(r.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchSettings = async (t: string) => {
    try {
      const r = await axios.get(`${BACKEND_URL}/api/settings`);
      setPaypalLink(r.data.paypal_link || '');
      setContactEmail(r.data.contact_email || '');
    } catch (e) { console.error(e); }
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await axios.put(`${BACKEND_URL}/api/admin/settings`, {
        paypal_link: paypalLink, contact_email: contactEmail,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Uspješno', 'Postavke sačuvane');
    } catch (e) { Alert.alert('Greška', 'Greška pri čuvanju postavki'); }
    setSettingsSaving(false);
  };

  const openNewLocation = () => {
    setEditLocation({ name: '', category: 'restaurant', address: '', latitude: 44.8797, longitude: 18.4275, phone: '', description: '', working_hours: '', is_premium: false });
    setIsNewLocation(true);
    setEditModalVisible(true);
  };

  const openEditLocation = (loc: LocationItem) => {
    setEditLocation({ ...loc });
    setIsNewLocation(false);
    setEditModalVisible(true);
  };

  const saveLocation = async () => {
    if (!editLocation.name || !editLocation.address || !editLocation.category) {
      Alert.alert('Greška', 'Ime, adresa i kategorija su obavezni');
      return;
    }
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (isNewLocation) {
        await axios.post(`${BACKEND_URL}/api/admin/locations`, editLocation, { headers });
      } else {
        await axios.put(`${BACKEND_URL}/api/admin/locations/${editLocation.id}`, editLocation, { headers });
      }
      setEditModalVisible(false);
      fetchLocations(token);
    } catch (e: any) {
      Alert.alert('Greška', e.response?.data?.detail || 'Greška pri čuvanju');
    }
    setSaving(false);
  };

  const deleteLocation = (loc: LocationItem) => {
    Alert.alert('Brisanje', `Obrisati "${loc.name}"?`, [
      { text: 'Odustani', style: 'cancel' },
      { text: 'Obriši', style: 'destructive', onPress: async () => {
        try {
          await axios.delete(`${BACKEND_URL}/api/admin/locations/${loc.id}`, { headers: { Authorization: `Bearer ${token}` } });
          fetchLocations(token);
        } catch (e) { Alert.alert('Greška', 'Greška pri brisanju'); }
      }},
    ]);
  };

  const getCatName = (id: string) => CATEGORIES.find(c => c.id === id)?.name || id;

  if (!fontsLoaded) return null;

  // LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <StatusBar barStyle="dark-content" />
        <View style={[s.loginWrap, { paddingTop: insets.top + 40 }]}>
          <TouchableOpacity testID="back-to-map-btn" style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={s.loginIcon}>
            <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
          </View>
          <Text style={s.loginTitle}>Admin Panel</Text>
          <Text style={s.loginSub}>Prijava za upravljanje sadržajem</Text>

          <View style={s.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
            <TextInput testID="admin-email-input" style={s.input} placeholder="Email" placeholderTextColor={colors.textSecondary}
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={s.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
            <TextInput testID="admin-password-input" style={s.input} placeholder="Lozinka" placeholderTextColor={colors.textSecondary}
              value={password} onChangeText={setPassword} secureTextEntry />
          </View>

          {loginError ? <Text testID="login-error" style={s.errorText}>{loginError}</Text> : null}

          <TouchableOpacity testID="admin-login-btn" style={s.loginBtn} onPress={handleLogin} disabled={loginLoading}>
            {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginBtnText}>Prijavi se</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ADMIN DASHBOARD
  return (
    <View testID="admin-dashboard" style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Admin Panel</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity testID="add-location-btn" style={s.addBtn} onPress={openNewLocation}>
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={s.addBtnText}>Dodaj</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="logout-btn" style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={s.stats}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{locations.length}</Text>
          <Text style={s.statLabel}>Ukupno lokacija</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: colors.success }]}>{locations.filter(l => l.is_premium).length}</Text>
          <Text style={s.statLabel}>Premium</Text>
        </View>
      </View>

      {/* Tab toggle */}
      <View style={s.tabRow}>
        <TouchableOpacity testID="tab-locations" style={[s.tab, !showSettings && s.tabActive]}
          onPress={() => setShowSettings(false)}>
          <Ionicons name="location-outline" size={18} color={!showSettings ? '#fff' : colors.textSecondary} />
          <Text style={[s.tabText, !showSettings && s.tabTextActive]}>Lokacije</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="tab-settings" style={[s.tab, showSettings && s.tabActive]}
          onPress={() => setShowSettings(true)}>
          <Ionicons name="cog-outline" size={18} color={showSettings ? '#fff' : colors.textSecondary} />
          <Text style={[s.tabText, showSettings && s.tabTextActive]}>Postavke</Text>
        </TouchableOpacity>
      </View>

      {/* Settings View */}
      {showSettings ? (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          <View style={s.settingsSection}>
            <Text style={s.settingsTitle}>PayPal Donacija</Text>
            <Text style={s.settingsDesc}>Unesite vaš PayPal.me link za primanje donacija u aplikaciji.</Text>
            <Text style={s.fieldLbl}>PayPal.me Link</Text>
            <TextInput testID="paypal-link-input" style={s.settingsInput} value={paypalLink}
              onChangeText={setPaypalLink} placeholder="https://paypal.me/VasUsername"
              placeholderTextColor={colors.textSecondary} autoCapitalize="none" />
            <Text style={s.settingsHint}>Npr: https://paypal.me/MojeIme ili paypal.me/MojeIme</Text>
          </View>

          <View style={s.settingsSection}>
            <Text style={s.settingsTitle}>Kontakt Email</Text>
            <TextInput testID="contact-email-input" style={s.settingsInput} value={contactEmail}
              onChangeText={setContactEmail} placeholder="info@gradacac-mapa.ba"
              placeholderTextColor={colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <TouchableOpacity testID="save-settings-btn" style={s.saveSettingsBtn} onPress={saveSettings} disabled={settingsSaving}>
            {settingsSaving ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={s.saveSettingsBtnText}>Sačuvaj postavke</Text></>
            )}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (

      /* Location list */
      loading ? <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} /> : (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          {locations.map(loc => (
            <View key={loc.id} testID={`admin-loc-${loc.id}`} style={s.locCard}>
              <View style={s.locBody}>
                <View style={s.locTopRow}>
                  <Text style={s.locName} numberOfLines={1}>{loc.name}</Text>
                  {loc.is_premium && (
                    <View style={s.premiumBadge}><Text style={s.premiumText}>PREMIUM</Text></View>
                  )}
                </View>
                <Text style={s.locCat}>{getCatName(loc.category)}</Text>
                <Text style={s.locAddr} numberOfLines={1}>{loc.address}</Text>
              </View>
              <View style={s.locActions}>
                <TouchableOpacity testID={`edit-loc-${loc.id}`} style={s.editBtn} onPress={() => openEditLocation(loc)}>
                  <Ionicons name="pencil" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity testID={`delete-loc-${loc.id}`} style={s.deleteBtn} onPress={() => deleteLocation(loc)}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      ))}

      {/* Edit/Add Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={s.modalOuter}>
          <TouchableOpacity style={s.modalBg} onPress={() => setEditModalVisible(false)} activeOpacity={1} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalKeyboard}>
            <View testID="edit-location-modal" style={s.modalBox}>
              <View style={s.modalHead}>
                <Text style={s.modalTitle}>{isNewLocation ? 'Nova lokacija' : 'Uredi lokaciju'}</Text>
                <TouchableOpacity testID="close-edit-modal" onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={s.modalScroll}>
                <Text style={s.fieldLabel}>Ime *</Text>
                <TextInput testID="edit-name" style={s.fieldInput} value={editLocation.name || ''} onChangeText={v => setEditLocation(p => ({ ...p, name: v }))} placeholder="Naziv lokacije" />

                <Text style={s.fieldLabel}>Kategorija *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catRow}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat.id} testID={`edit-cat-${cat.id}`}
                      style={[s.catOption, editLocation.category === cat.id && s.catOptionActive]}
                      onPress={() => setEditLocation(p => ({ ...p, category: cat.id }))}>
                      <Text style={[s.catOptionText, editLocation.category === cat.id && s.catOptionTextActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={s.fieldLabel}>Adresa *</Text>
                <TextInput testID="edit-address" style={s.fieldInput} value={editLocation.address || ''} onChangeText={v => setEditLocation(p => ({ ...p, address: v }))} placeholder="Ulica i broj" />

                <View style={s.rowFields}>
                  <View style={s.halfField}>
                    <Text style={s.fieldLabel}>Latitude</Text>
                    <TextInput testID="edit-lat" style={s.fieldInput} value={String(editLocation.latitude || '')} onChangeText={v => setEditLocation(p => ({ ...p, latitude: parseFloat(v) || 0 }))} keyboardType="numeric" />
                  </View>
                  <View style={s.halfField}>
                    <Text style={s.fieldLabel}>Longitude</Text>
                    <TextInput testID="edit-lng" style={s.fieldInput} value={String(editLocation.longitude || '')} onChangeText={v => setEditLocation(p => ({ ...p, longitude: parseFloat(v) || 0 }))} keyboardType="numeric" />
                  </View>
                </View>

                <Text style={s.fieldLabel}>Telefon</Text>
                <TextInput testID="edit-phone" style={s.fieldInput} value={editLocation.phone || ''} onChangeText={v => setEditLocation(p => ({ ...p, phone: v }))} placeholder="+387 35 ..." keyboardType="phone-pad" />

                <Text style={s.fieldLabel}>Opis</Text>
                <TextInput testID="edit-description" style={[s.fieldInput, { height: 60 }]} value={editLocation.description || ''} onChangeText={v => setEditLocation(p => ({ ...p, description: v }))} placeholder="Kratki opis" multiline />

                <Text style={s.fieldLabel}>Radno vrijeme</Text>
                <TextInput testID="edit-hours" style={s.fieldInput} value={editLocation.working_hours || ''} onChangeText={v => setEditLocation(p => ({ ...p, working_hours: v }))} placeholder="08:00 - 22:00" />

                <TouchableOpacity testID="edit-premium-toggle" style={s.premiumToggle} onPress={() => setEditLocation(p => ({ ...p, is_premium: !p.is_premium }))}>
                  <Ionicons name={editLocation.is_premium ? 'checkbox' : 'square-outline'} size={24} color={editLocation.is_premium ? colors.success : colors.textSecondary} />
                  <Text style={s.premiumToggleText}>Premium lokacija (plaćena pretplata)</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="save-location-btn" style={s.saveBtn} onPress={saveLocation} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={s.saveBtnText}>{isNewLocation ? 'Dodaj lokaciju' : 'Sačuvaj izmjene'}</Text></>
                  )}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Login
  loginWrap: { flex: 1, paddingHorizontal: 32, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 24, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  loginIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  loginTitle: { fontSize: 28, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, letterSpacing: -0.8 },
  loginSub: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, marginTop: 4, marginBottom: 32 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 16 : 12, borderWidth: 1, borderColor: colors.border, marginBottom: 14, width: '100%' },
  input: { flex: 1, fontSize: 15, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, marginLeft: 12 },
  errorText: { color: colors.danger, fontSize: 14, fontFamily: 'Manrope_500Medium', marginBottom: 12 },
  loginBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, width: '100%', alignItems: 'center', marginTop: 8 },
  loginBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginRight: 12 },
  headerTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.textPrimary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Manrope_700Bold', marginLeft: 4 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  // Stats
  stats: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statNum: { fontSize: 28, fontFamily: 'Outfit_700Bold', color: colors.textPrimary },
  statLabel: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: colors.textSecondary, marginTop: 4 },
  // List
  list: { flex: 1, paddingHorizontal: 20 },
  locCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  locBody: { flex: 1 },
  locTopRow: { flexDirection: 'row', alignItems: 'center' },
  locName: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: colors.textPrimary, flex: 1 },
  premiumBadge: { backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  premiumText: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: colors.success },
  locCat: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: colors.accent, marginTop: 2 },
  locAddr: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, marginTop: 2 },
  locActions: { flexDirection: 'row', gap: 8, marginLeft: 12 },
  editBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  deleteBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFE0E0' },
  // Modal
  modalOuter: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalKeyboard: { flex: 1, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 20, paddingHorizontal: 24, maxHeight: height * 0.85 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.textPrimary },
  modalScroll: { flex: 1 },
  fieldLabel: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  fieldInput: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  catRow: { marginBottom: 4 },
  catOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  catOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catOptionText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: colors.textPrimary },
  catOptionTextActive: { color: '#fff' },
  rowFields: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  premiumToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  premiumToggleText: { fontSize: 15, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, marginLeft: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold', marginLeft: 8 },
  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: colors.textSecondary, marginLeft: 6 },
  tabTextActive: { color: '#fff' },
  // Settings
  settingsSection: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  settingsTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, marginBottom: 6 },
  settingsDesc: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, marginBottom: 14, lineHeight: 20 },
  fieldLbl: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  settingsInput: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  settingsHint: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, marginTop: 6 },
  saveSettingsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  saveSettingsBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold', marginLeft: 8 },
});
