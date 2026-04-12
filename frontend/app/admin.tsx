import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert,
  ActivityIndicator, Modal, Dimensions, Platform, StatusBar, KeyboardAvoidingView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFonts, Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium } from '@expo-google-fonts/outfit';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return await AsyncStorage.getItem(key);
    } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') { typeof window !== 'undefined' && window.localStorage.setItem(key, value); return; }
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') { typeof window !== 'undefined' && window.localStorage.removeItem(key); return; }
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const c = {
  bg: '#FAF9F6', surface: '#FFF', primary: '#4A5D4E', primaryFg: '#FFF',
  accent: '#D97757', accentFg: '#FFF', text: '#1C1C1C', textSec: '#6B6B6B',
  border: '#E5E4E2', danger: '#E74C3C', success: '#27AE60', notif: '#3B82F6',
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
  images?: string[]; service_tags?: string[];
}

interface NotifItem {
  id: string; title: string; body: string; total_devices: number;
  successful: number; failed: number; created_at: string;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  // Tabs
  const [activeTab, setActiveTab] = useState<'locations' | 'categories' | 'businesses' | 'tourism' | 'events' | 'notifications' | 'settings'>('locations');
  // Locations
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLocation, setEditLocation] = useState<Partial<LocationItem>>({});
  const [isNewLocation, setIsNewLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Categories
  const [adminCategories, setAdminCategories] = useState<{id:string;name:string;icon:string;color:string}[]>([]);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [editCat, setEditCat] = useState<{id?:string;name:string;icon:string;color:string}>({ name: '', icon: 'location', color: '#888888' });
  const [isNewCat, setIsNewCat] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  // Notifications
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [activeDevices, setActiveDevices] = useState(0);
  // Settings
  const [paypalLink, setPaypalLink] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  // Business accounts
  const [bizAccounts, setBizAccounts] = useState<any[]>([]);
  const [bizModalVisible, setBizModalVisible] = useState(false);
  const [newBizEmail, setNewBizEmail] = useState('');
  const [newBizPassword, setNewBizPassword] = useState('');
  const [newBizName, setNewBizName] = useState('');
  const [newBizLocId, setNewBizLocId] = useState('');
  const [savingBiz, setSavingBiz] = useState(false);
  // Tourism
  const [tourismItems, setTourismItems] = useState<any[]>([]);
  const [tourModalVisible, setTourModalVisible] = useState(false);
  const [editTour, setEditTour] = useState<any>({ name: '', description: '', latitude: 44.8797, longitude: 18.4275, category: 'Ostalo' });
  const [isNewTour, setIsNewTour] = useState(false);
  const [savingTour, setSavingTour] = useState(false);
  // Events
  const [adminEvents, setAdminEvents] = useState<any[]>([]);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [editEvent, setEditEvent] = useState<any>({ title: '', description: '', location_name: '', date: '', time: '' });
  const [isNewEvent, setIsNewEvent] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  const [fontsLoaded] = useFonts({
    Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
  });

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const saved = await Storage.getItem('admin_token');
    if (saved) { setToken(saved); setIsLoggedIn(true); loadAll(saved); }
  };

  const loadAll = (t: string) => { fetchLocations(t); fetchSettings(); fetchNotifications(t); fetchPushStats(t); fetchAdminCategories(); fetchBizAccounts(t); fetchTourism(); fetchAdminEvents(); };

  const handleLogin = async () => {
    setLoginLoading(true); setLoginError('');
    try {
      const r = await axios.post(`${BACKEND_URL}/api/auth/login`, { email: email.toLowerCase(), password });
      const t = r.data.token;
      setToken(t); await Storage.setItem('admin_token', t);
      setIsLoggedIn(true); loadAll(t);
    } catch (e: any) { setLoginError(e.response?.data?.detail || 'Greška pri prijavi'); }
    setLoginLoading(false);
  };

  const handleLogout = async () => { await Storage.removeItem('admin_token'); setIsLoggedIn(false); setToken(''); };

  // Locations
  const fetchLocations = async (t: string) => {
    setLoading(true);
    try { const r = await axios.get(`${BACKEND_URL}/api/locations`); setLocations(r.data); } catch {}
    setLoading(false);
  };

  const openNewLocation = () => {
    setEditLocation({ name: '', category: 'restaurant', address: '', latitude: 44.8797, longitude: 18.4275, phone: '', description: '', working_hours: '', is_premium: false, images: [] });
    setIsNewLocation(true); setEditModalVisible(true);
  };

  const openEditLocation = (loc: LocationItem) => { setEditLocation({ ...loc }); setIsNewLocation(false); setEditModalVisible(true); };

  const saveLocation = async () => {
    if (!editLocation.name || !editLocation.address) { Alert.alert('Greška', 'Ime i adresa su obavezni'); return; }
    setSaving(true);
    try {
      const h = { headers: { Authorization: `Bearer ${token}` } };
      if (isNewLocation) { await axios.post(`${BACKEND_URL}/api/admin/locations`, editLocation, h); }
      else { await axios.put(`${BACKEND_URL}/api/admin/locations/${editLocation.id}`, editLocation, h); }
      setEditModalVisible(false); fetchLocations(token);
    } catch (e: any) { Alert.alert('Greška', e.response?.data?.detail || 'Greška'); }
    setSaving(false);
  };

  const deleteLocation = (loc: LocationItem) => {
    Alert.alert('Brisanje', `Obrisati "${loc.name}"?`, [
      { text: 'Odustani', style: 'cancel' },
      { text: 'Obriši', style: 'destructive', onPress: async () => {
        try { await axios.delete(`${BACKEND_URL}/api/admin/locations/${loc.id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchLocations(token); } catch {}
      }},
    ]);
  };

  // Image Upload
  const pickAndUploadImage = async () => {
    if (!editLocation.id && isNewLocation) { Alert.alert('Info', 'Prvo sačuvajte lokaciju, zatim dodajte slike'); return; }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Dozvola', 'Potrebna je dozvola za pristup galeriji'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      if (result.canceled || !result.assets[0].base64) return;
      setUploadingImage(true);
      const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
      // Upload via FormData for native, or direct base64 for web
      if (Platform.OS === 'web') {
        // For web, convert base64 to blob and upload
        const blob = await fetch(base64Data).then(r => r.blob());
        const formData = new FormData();
        formData.append('file', blob, 'image.jpg');
        await axios.post(`${BACKEND_URL}/api/admin/locations/${editLocation.id}/images`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const formData = new FormData();
        formData.append('file', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'image.jpg' } as any);
        await axios.post(`${BACKEND_URL}/api/admin/locations/${editLocation.id}/images`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
      }
      // Refresh location data
      const updated = await axios.get(`${BACKEND_URL}/api/locations/${editLocation.id}`);
      setEditLocation(prev => ({ ...prev, images: updated.data.images }));
      fetchLocations(token);
    } catch (e: any) { Alert.alert('Greška', 'Greška pri uploadu slike'); console.error(e); }
    setUploadingImage(false);
  };

  const deleteImage = async (index: number) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/admin/locations/${editLocation.id}/images/${index}`, { headers: { Authorization: `Bearer ${token}` } });
      const updated = await axios.get(`${BACKEND_URL}/api/locations/${editLocation.id}`);
      setEditLocation(prev => ({ ...prev, images: updated.data.images }));
    } catch { Alert.alert('Greška', 'Greška pri brisanju slike'); }
  };

  // Notifications
  const fetchNotifications = async (t: string) => {
    try { const r = await axios.get(`${BACKEND_URL}/api/admin/notifications`, { headers: { Authorization: `Bearer ${t}` } }); setNotifications(r.data); } catch {}
  };

  const fetchPushStats = async (t: string) => {
    try { const r = await axios.get(`${BACKEND_URL}/api/admin/push-stats`, { headers: { Authorization: `Bearer ${t}` } }); setActiveDevices(r.data.active_devices); } catch {}
  };

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) { Alert.alert('Greška', 'Naslov i tekst su obavezni'); return; }
    setSendingNotif(true);
    try {
      const r = await axios.post(`${BACKEND_URL}/api/admin/notifications/send`, { title: notifTitle.trim(), body: notifBody.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Poslano!', `Obavještenje poslano na ${r.data.total_devices} uređaja.\nUspješno: ${r.data.successful}\nNeuspješno: ${r.data.failed}`);
      setNotifTitle(''); setNotifBody('');
      fetchNotifications(token);
    } catch { Alert.alert('Greška', 'Greška pri slanju'); }
    setSendingNotif(false);
  };

  // Settings
  const fetchSettings = async () => {
    try { const r = await axios.get(`${BACKEND_URL}/api/settings`); setPaypalLink(r.data.paypal_link || ''); setContactEmail(r.data.contact_email || ''); } catch {}
  };

  const fetchAdminCategories = async () => {
    try { const r = await axios.get(`${BACKEND_URL}/api/categories`); setAdminCategories(r.data); } catch {}
  };

  const fetchBizAccounts = async (t: string) => {
    try { const r = await axios.get(`${BACKEND_URL}/api/admin/business-accounts`, { headers: { Authorization: `Bearer ${t}` } }); setBizAccounts(r.data); } catch {}
  };

  const createBizAccount = async () => {
    if (!newBizEmail || !newBizPassword || !newBizName || !newBizLocId) { Alert.alert('Greška', 'Sva polja su obavezna'); return; }
    setSavingBiz(true);
    try {
      await axios.post(`${BACKEND_URL}/api/admin/business-accounts`, { email: newBizEmail, password: newBizPassword, name: newBizName, location_id: newBizLocId }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Uspjeh', `Biznis nalog kreiran za ${newBizEmail}`);
      setBizModalVisible(false); setNewBizEmail(''); setNewBizPassword(''); setNewBizName(''); setNewBizLocId('');
      fetchBizAccounts(token);
    } catch (e: any) { Alert.alert('Greška', e.response?.data?.detail || 'Greška'); }
    setSavingBiz(false);
  };

  const deleteBizAccount = (biz: any) => {
    Alert.alert('Brisanje', `Obrisati nalog "${biz.email}"?`, [
      { text: 'Odustani', style: 'cancel' },
      { text: 'Obriši', style: 'destructive', onPress: async () => {
        try { await axios.delete(`${BACKEND_URL}/api/admin/business-accounts/${biz.id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchBizAccounts(token); } catch {}
      }},
    ]);
  };

  // Tourism
  const fetchTourism = async () => {
    try { setTourismItems((await axios.get(`${BACKEND_URL}/api/tourism/attractions`)).data); } catch {}
  };
  const openNewTour = () => { setEditTour({ name: '', description: '', latitude: 44.8797, longitude: 18.4275, category: 'Ostalo' }); setIsNewTour(true); setTourModalVisible(true); };
  const openEditTour = (t: any) => { setEditTour({ ...t }); setIsNewTour(false); setTourModalVisible(true); };
  const saveTour = async () => {
    if (!editTour.name || !editTour.description) { Alert.alert('Greška', 'Ime i opis su obavezni'); return; }
    setSavingTour(true);
    try {
      const h = { headers: { Authorization: `Bearer ${token}` } };
      if (isNewTour) { await axios.post(`${BACKEND_URL}/api/admin/tourism/attractions`, editTour, h); }
      else { await axios.put(`${BACKEND_URL}/api/admin/tourism/attractions/${editTour.id}`, editTour, h); }
      setTourModalVisible(false); fetchTourism();
    } catch (e: any) { Alert.alert('Greška', e.response?.data?.detail || 'Greška'); }
    setSavingTour(false);
  };
  const deleteTour = (t: any) => {
    Alert.alert('Brisanje', `Obrisati "${t.name}"?`, [
      { text: 'Odustani', style: 'cancel' },
      { text: 'Obriši', style: 'destructive', onPress: async () => {
        try { await axios.delete(`${BACKEND_URL}/api/admin/tourism/attractions/${t.id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchTourism(); }
        catch (e: any) { Alert.alert('Greška', e.response?.data?.detail || 'Greška'); }
      }},
    ]);
  };

  // Events
  const fetchAdminEvents = async () => {
    try { setAdminEvents((await axios.get(`${BACKEND_URL}/api/events`)).data); } catch {}
  };
  const openNewEvent = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditEvent({ title: '', description: '', location_name: '', date: today, time: '' });
    setIsNewEvent(true); setEventModalVisible(true);
  };
  const openEditEvent = (e: any) => { setEditEvent({ ...e }); setIsNewEvent(false); setEventModalVisible(true); };
  const saveEvent = async () => {
    if (!editEvent.title || !editEvent.description || !editEvent.date || !editEvent.location_name) { Alert.alert('Greška', 'Naslov, opis, lokacija i datum su obavezni'); return; }
    setSavingEvent(true);
    try {
      const h = { headers: { Authorization: `Bearer ${token}` } };
      if (isNewEvent) { await axios.post(`${BACKEND_URL}/api/admin/events`, editEvent, h); }
      else { /* events don't have update yet, create new */ await axios.post(`${BACKEND_URL}/api/admin/events`, editEvent, h); }
      setEventModalVisible(false); fetchAdminEvents();
    } catch (e: any) { Alert.alert('Greška', e.response?.data?.detail || 'Greška'); }
    setSavingEvent(false);
  };
  const deleteEvent = (ev: any) => {
    Alert.alert('Brisanje', `Obrisati "${ev.title}"?`, [
      { text: 'Odustani', style: 'cancel' },
      { text: 'Obriši', style: 'destructive', onPress: async () => {
        try { await axios.delete(`${BACKEND_URL}/api/admin/events/${ev.id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchAdminEvents(); }
        catch (e: any) { Alert.alert('Greška', e.response?.data?.detail || 'Greška'); }
      }},
    ]);
  };

  const openNewCat = () => { setEditCat({ name: '', icon: 'location', color: '#888888' }); setIsNewCat(true); setCatModalVisible(true); };
  const openEditCat = (cat: any) => { setEditCat({ ...cat }); setIsNewCat(false); setCatModalVisible(true); };

  const saveCat = async () => {
    if (!editCat.name.trim()) { Alert.alert('Greška', 'Ime kategorije je obavezno'); return; }
    setSavingCat(true);
    try {
      const h = { headers: { Authorization: `Bearer ${token}` } };
      if (isNewCat) { await axios.post(`${BACKEND_URL}/api/admin/categories`, editCat, h); }
      else { await axios.put(`${BACKEND_URL}/api/admin/categories/${editCat.id}`, editCat, h); }
      setCatModalVisible(false); fetchAdminCategories();
    } catch (e: any) { Alert.alert('Greška', e.response?.data?.detail || 'Greška'); }
    setSavingCat(false);
  };

  const deleteCat = (cat: any) => {
    Alert.alert('Brisanje', `Obrisati kategoriju "${cat.name}"?`, [
      { text: 'Odustani', style: 'cancel' },
      { text: 'Obriši', style: 'destructive', onPress: async () => {
        try { await axios.delete(`${BACKEND_URL}/api/admin/categories/${cat.id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchAdminCategories(); }
        catch (e: any) { Alert.alert('Greška', e.response?.data?.detail || 'Greška pri brisanju'); }
      }},
    ]);
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await axios.put(`${BACKEND_URL}/api/admin/settings`, { paypal_link: paypalLink, contact_email: contactEmail }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Uspješno', 'Postavke sačuvane');
    } catch { Alert.alert('Greška', 'Greška pri čuvanju'); }
    setSettingsSaving(false);
  };

  const getCatName = (id: string) => CATEGORIES.find(x => x.id === id)?.name || id;

  if (!fontsLoaded) return null;

  // ===== LOGIN =====
  if (!isLoggedIn) return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />
      <View style={[s.loginWrap, { paddingTop: insets.top + 40 }]}>
        <TouchableOpacity testID="back-to-map-btn" style={s.backCircle} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <View style={s.loginIcon}><Ionicons name="shield-checkmark" size={48} color={c.primary} /></View>
        <Text style={s.loginTitle}>Admin Panel</Text>
        <Text style={s.loginSub}>Prijava za upravljanje sadržajem</Text>
        <View style={s.inputRow}>
          <Ionicons name="mail-outline" size={20} color={c.textSec} />
          <TextInput testID="admin-email-input" style={s.inputField} placeholder="Email" placeholderTextColor={c.textSec} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>
        <View style={s.inputRow}>
          <Ionicons name="lock-closed-outline" size={20} color={c.textSec} />
          <TextInput testID="admin-password-input" style={s.inputField} placeholder="Lozinka" placeholderTextColor={c.textSec} value={password} onChangeText={setPassword} secureTextEntry />
        </View>
        {loginError ? <Text testID="login-error" style={s.errorTxt}>{loginError}</Text> : null}
        <TouchableOpacity testID="admin-login-btn" style={s.loginBtn} onPress={handleLogin} disabled={loginLoading}>
          {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginBtnTxt}>Prijavi se</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ===== DASHBOARD =====
  return (
    <View testID="admin-dashboard" style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerL}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={s.headerBtn}><Ionicons name="arrow-back" size={22} color={c.text} /></TouchableOpacity>
          <Text style={s.headerTitle}>Admin Panel</Text>
        </View>
        <View style={s.headerR}>
          {activeTab === 'locations' && (
            <TouchableOpacity testID="add-location-btn" style={s.addBtn} onPress={openNewLocation}>
              <Ionicons name="add" size={22} color="#fff" /><Text style={s.addBtnTxt}>Dodaj</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity testID="logout-btn" style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={c.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['locations', 'categories', 'businesses', 'tourism', 'events', 'notifications', 'settings'] as const).map(tab => (
          <TouchableOpacity key={tab} testID={`tab-${tab}`} style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Ionicons name={tab === 'locations' ? 'location-outline' : tab === 'categories' ? 'grid-outline' : tab === 'businesses' ? 'people-outline' : tab === 'tourism' ? 'business-outline' : tab === 'events' ? 'calendar-outline' : tab === 'notifications' ? 'notifications-outline' : 'cog-outline'}
              size={13} color={activeTab === tab ? '#fff' : c.textSec} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ===== LOCATIONS TAB ===== */}
      {activeTab === 'locations' && (
        loading ? <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} /> : (
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            <View style={s.stats}>
              <View style={s.statCard}><Text style={s.statNum}>{locations.length}</Text><Text style={s.statLbl}>Ukupno</Text></View>
              <View style={s.statCard}><Text style={[s.statNum, { color: c.success }]}>{locations.filter(l => l.is_premium).length}</Text><Text style={s.statLbl}>Premium</Text></View>
            </View>
            {locations.map(loc => (
              <View key={loc.id} testID={`admin-loc-${loc.id}`} style={s.locCard}>
                {loc.images && loc.images.length > 0 && (
                  <Image source={{ uri: loc.images[0] }} style={s.locThumb} />
                )}
                <View style={s.locBody}>
                  <View style={s.locTopRow}>
                    <Text style={s.locName} numberOfLines={1}>{loc.name}</Text>
                    {loc.is_premium && <View style={s.premBadge}><Text style={s.premTxt}>PREMIUM</Text></View>}
                  </View>
                  <Text style={s.locCat}>{getCatName(loc.category)}</Text>
                  <Text style={s.locAddr} numberOfLines={1}>{loc.address}</Text>
                  {loc.images && loc.images.length > 0 && (
                    <Text style={s.locImgCount}>{loc.images.length} slika</Text>
                  )}
                </View>
                <View style={s.locActions}>
                  <TouchableOpacity testID={`edit-loc-${loc.id}`} style={s.editBtn} onPress={() => openEditLocation(loc)}>
                    <Ionicons name="pencil" size={18} color={c.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity testID={`delete-loc-${loc.id}`} style={s.delBtn} onPress={() => deleteLocation(loc)}>
                    <Ionicons name="trash-outline" size={18} color={c.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      )}

      {/* ===== BUSINESSES TAB ===== */}
      {activeTab === 'businesses' && (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          <View style={s.catHeader}>
            <Text style={s.catHeaderTxt}>{bizAccounts.length} biznis naloga</Text>
            <TouchableOpacity testID="add-biz-btn" style={s.addCatBtn} onPress={() => setBizModalVisible(true)}>
              <Ionicons name="add" size={18} color="#fff" /><Text style={s.addCatBtnTxt}>Novi</Text>
            </TouchableOpacity>
          </View>
          {bizAccounts.map(biz => (
            <View key={biz.id} testID={`biz-${biz.id}`} style={s.catCard}>
              <View style={[s.catColorDot, { backgroundColor: c.primary }]}>
                <Ionicons name="person" size={18} color="#fff" />
              </View>
              <View style={s.catCardBody}>
                <Text style={s.catCardName}>{biz.name}</Text>
                <Text style={s.catCardIcon}>{biz.email}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.accent }}>{biz.location_name}</Text>
              </View>
              <TouchableOpacity style={s.delBtn} onPress={() => deleteBizAccount(biz)}>
                <Ionicons name="trash-outline" size={16} color={c.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===== TOURISM TAB ===== */}
      {activeTab === 'tourism' && (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          <View style={s.catHeader}>
            <Text style={s.catHeaderTxt}>{tourismItems.length} znamenitosti</Text>
            <TouchableOpacity testID="add-tourism-btn" style={s.addCatBtn} onPress={openNewTour}>
              <Ionicons name="add" size={18} color="#fff" /><Text style={s.addCatBtnTxt}>Nova</Text>
            </TouchableOpacity>
          </View>
          {tourismItems.map(t => (
            <View key={t.id} testID={`tour-${t.id}`} style={s.catCard}>
              <View style={[s.catColorDot, { backgroundColor: c.primary + '20' }]}>
                <Ionicons name="business" size={18} color={c.primary} />
              </View>
              <View style={s.catCardBody}>
                <Text style={s.catCardName}>{t.name}</Text>
                <Text style={s.catCardIcon} numberOfLines={2}>{t.description}</Text>
                <Text style={{ fontSize: 10, fontFamily: 'Manrope_600SemiBold', color: c.accent, marginTop: 2 }}>{t.category}</Text>
              </View>
              <TouchableOpacity style={s.editBtn} onPress={() => openEditTour(t)}>
                <Ionicons name="pencil" size={16} color={c.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={s.delBtn} onPress={() => deleteTour(t)}>
                <Ionicons name="trash-outline" size={16} color={c.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===== CATEGORIES TAB ===== */}
      {activeTab === 'categories' && (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          <View style={s.catHeader}>
            <Text style={s.catHeaderTxt}>{adminCategories.length} kategorija</Text>
            <TouchableOpacity testID="add-category-btn" style={s.addCatBtn} onPress={openNewCat}>
              <Ionicons name="add" size={18} color="#fff" /><Text style={s.addCatBtnTxt}>Nova</Text>
            </TouchableOpacity>
          </View>
          {adminCategories.map(cat => (
            <View key={cat.id} testID={`admin-cat-${cat.id}`} style={s.catCard}>
              <View style={[s.catColorDot, { backgroundColor: cat.color }]} />
              <View style={s.catCardBody}>
                <Text style={s.catCardName}>{cat.name}</Text>
                <Text style={s.catCardIcon}>Ikona: {cat.icon}</Text>
              </View>
              <TouchableOpacity testID={`edit-cat-${cat.id}`} style={s.editBtn} onPress={() => openEditCat(cat)}>
                <Ionicons name="pencil" size={16} color={c.primary} />
              </TouchableOpacity>
              <TouchableOpacity testID={`delete-cat-${cat.id}`} style={s.delBtn} onPress={() => deleteCat(cat)}>
                <Ionicons name="trash-outline" size={16} color={c.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===== EVENTS TAB ===== */}
      {activeTab === 'events' && (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          <View style={s.catHeader}>
            <Text style={s.catHeaderTxt}>{adminEvents.length} događaja</Text>
            <TouchableOpacity testID="add-event-btn" style={s.addCatBtn} onPress={openNewEvent}>
              <Ionicons name="add" size={18} color="#fff" /><Text style={s.addCatBtnTxt}>Novi</Text>
            </TouchableOpacity>
          </View>
          {adminEvents.map(ev => (
            <View key={ev.id} testID={`event-${ev.id}`} style={s.catCard}>
              <View style={[s.catColorDot, { backgroundColor: c.accent + '20' }]}>
                <Text style={{ fontSize: 14, fontFamily: 'Outfit_700Bold', color: c.accent }}>{ev.date?.split('-')[2]}</Text>
              </View>
              <View style={s.catCardBody}>
                <Text style={s.catCardName}>{ev.title}</Text>
                <Text style={s.catCardIcon} numberOfLines={1}>{ev.description}</Text>
                <Text style={{ fontSize: 10, fontFamily: 'Manrope_500Medium', color: c.textSec }}>{ev.date} {ev.time ? `• ${ev.time}` : ''} • {ev.location_name}</Text>
              </View>
              <TouchableOpacity style={s.delBtn} onPress={() => deleteEvent(ev)}>
                <Ionicons name="trash-outline" size={16} color={c.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===== NOTIFICATIONS TAB ===== */}
      {activeTab === 'notifications' && (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          {/* Send notification form */}
          <View style={s.notifCard}>
            <View style={s.notifHeader}>
              <Ionicons name="megaphone" size={24} color={c.notif} />
              <Text style={s.notifTitle}>Pošalji obavještenje</Text>
            </View>
            <Text style={s.notifDevices}>
              <Ionicons name="phone-portrait-outline" size={14} color={c.textSec} /> {activeDevices} aktivnih uređaja
            </Text>
            <Text style={s.fldLbl}>Naslov *</Text>
            <TextInput testID="notif-title-input" style={s.fldInput} value={notifTitle} onChangeText={setNotifTitle}
              placeholder="Npr: Dani šljive u Gradačcu" placeholderTextColor={c.textSec} />
            <Text style={s.fldLbl}>Tekst poruke *</Text>
            <TextInput testID="notif-body-input" style={[s.fldInput, { height: 80, textAlignVertical: 'top' }]}
              value={notifBody} onChangeText={setNotifBody} placeholder="Opišite događaj ili manifestaciju..."
              placeholderTextColor={c.textSec} multiline />
            <TouchableOpacity testID="send-notif-btn" style={s.sendBtn} onPress={sendNotification} disabled={sendingNotif}>
              {sendingNotif ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="send" size={18} color="#fff" /><Text style={s.sendBtnTxt}>Pošalji svima</Text></>
              )}
            </TouchableOpacity>
          </View>

          {/* History */}
          <Text style={s.historyTitle}>Historija obavještenja</Text>
          {notifications.length === 0 ? (
            <View style={s.emptyState}><Text style={s.emptyTxt}>Još nema poslanih obavještenja</Text></View>
          ) : (
            notifications.map(n => (
              <View key={n.id} testID={`notif-${n.id}`} style={s.historyCard}>
                <View style={s.historyTop}>
                  <Text style={s.historyName}>{n.title}</Text>
                  <Text style={s.historyDate}>{new Date(n.created_at).toLocaleDateString('bs-BA')}</Text>
                </View>
                <Text style={s.historyBody}>{n.body}</Text>
                <View style={s.historyStats}>
                  <Text style={s.historyStatTxt}><Ionicons name="phone-portrait" size={12} color={c.textSec} /> {n.total_devices}</Text>
                  <Text style={[s.historyStatTxt, { color: c.success }]}><Ionicons name="checkmark-circle" size={12} color={c.success} /> {n.successful}</Text>
                  {n.failed > 0 && <Text style={[s.historyStatTxt, { color: c.danger }]}><Ionicons name="close-circle" size={12} color={c.danger} /> {n.failed}</Text>}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===== SETTINGS TAB ===== */}
      {activeTab === 'settings' && (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          <View style={s.settingsCard}>
            <Text style={s.settingsTitle}>PayPal Donacija</Text>
            <Text style={s.settingsDesc}>Unesite vaš PayPal.me link za primanje donacija.</Text>
            <Text style={s.fldLbl}>PayPal.me Link</Text>
            <TextInput testID="paypal-link-input" style={s.fldInput} value={paypalLink} onChangeText={setPaypalLink}
              placeholder="https://paypal.me/VasUsername" placeholderTextColor={c.textSec} autoCapitalize="none" />
          </View>
          <View style={s.settingsCard}>
            <Text style={s.settingsTitle}>Kontakt Email</Text>
            <TextInput testID="contact-email-input" style={s.fldInput} value={contactEmail} onChangeText={setContactEmail}
              placeholder="info@gradacac-mapa.ba" placeholderTextColor={c.textSec} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <TouchableOpacity testID="save-settings-btn" style={s.saveSetBtn} onPress={saveSettings} disabled={settingsSaving}>
            {settingsSaving ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={s.saveSetBtnTxt}>Sačuvaj postavke</Text></>
            )}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===== EDIT/ADD LOCATION MODAL ===== */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={s.modalOuter}>
          <TouchableOpacity style={s.modalBg} onPress={() => setEditModalVisible(false)} activeOpacity={1} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalKb}>
            <View testID="edit-location-modal" style={s.modalBox}>
              <View style={s.modalHead}>
                <Text style={s.modalTitle}>{isNewLocation ? 'Nova lokacija' : 'Uredi lokaciju'}</Text>
                <TouchableOpacity testID="close-edit-modal" onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color={c.textSec} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Images */}
                {!isNewLocation && (
                  <View style={s.imgSection}>
                    <Text style={s.fldLbl}>Slike</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.imgScroll}>
                      {(editLocation.images || []).map((img, i) => (
                        <View key={i} style={s.imgThumbWrap}>
                          <Image source={{ uri: img }} style={s.imgThumb} />
                          <TouchableOpacity testID={`delete-img-${i}`} style={s.imgDelBtn} onPress={() => deleteImage(i)}>
                            <Ionicons name="close" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity testID="upload-image-btn" style={s.imgAddBtn} onPress={pickAndUploadImage} disabled={uploadingImage}>
                        {uploadingImage ? <ActivityIndicator size="small" color={c.accent} /> : (
                          <><Ionicons name="camera-outline" size={28} color={c.accent} /><Text style={s.imgAddTxt}>Dodaj</Text></>
                        )}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                )}

                <Text style={s.fldLbl}>Ime *</Text>
                <TextInput testID="edit-name" style={s.fldInput} value={editLocation.name || ''} onChangeText={v => setEditLocation(p => ({ ...p, name: v }))} placeholder="Naziv" />

                <Text style={s.fldLbl}>Kategorija *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat.id} testID={`edit-cat-${cat.id}`}
                      style={[s.catOpt, editLocation.category === cat.id && s.catOptActive]}
                      onPress={() => setEditLocation(p => ({ ...p, category: cat.id }))}>
                      <Text style={[s.catOptTxt, editLocation.category === cat.id && s.catOptTxtActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={s.fldLbl}>Adresa *</Text>
                <TextInput testID="edit-address" style={s.fldInput} value={editLocation.address || ''} onChangeText={v => setEditLocation(p => ({ ...p, address: v }))} placeholder="Ulica" />

                <View style={s.rowFld}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fldLbl}>Latitude</Text>
                    <TextInput testID="edit-lat" style={s.fldInput} value={String(editLocation.latitude || '')} onChangeText={v => setEditLocation(p => ({ ...p, latitude: parseFloat(v) || 0 }))} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.fldLbl}>Longitude</Text>
                    <TextInput testID="edit-lng" style={s.fldInput} value={String(editLocation.longitude || '')} onChangeText={v => setEditLocation(p => ({ ...p, longitude: parseFloat(v) || 0 }))} keyboardType="numeric" />
                  </View>
                </View>

                <Text style={s.fldLbl}>Telefon</Text>
                <TextInput testID="edit-phone" style={s.fldInput} value={editLocation.phone || ''} onChangeText={v => setEditLocation(p => ({ ...p, phone: v }))} placeholder="+387 35 ..." keyboardType="phone-pad" />

                <Text style={s.fldLbl}>Opis</Text>
                <TextInput testID="edit-description" style={[s.fldInput, { height: 70 }]} value={editLocation.description || ''} onChangeText={v => setEditLocation(p => ({ ...p, description: v }))} placeholder="Opis" multiline />

                <Text style={s.fldLbl}>Radno vrijeme</Text>
                <TextInput testID="edit-hours" style={s.fldInput} value={editLocation.working_hours || ''} onChangeText={v => setEditLocation(p => ({ ...p, working_hours: v }))} placeholder="08:00 - 22:00" />

                <TouchableOpacity testID="edit-premium-toggle" style={s.premToggle} onPress={() => setEditLocation(p => ({ ...p, is_premium: !p.is_premium }))}>
                  <Ionicons name={editLocation.is_premium ? 'checkbox' : 'square-outline'} size={24} color={editLocation.is_premium ? c.success : c.textSec} />
                  <Text style={s.premToggleTxt}>Premium lokacija</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="save-location-btn" style={s.saveLocBtn} onPress={saveLocation} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={s.saveLocBtnTxt}>{isNewLocation ? 'Dodaj' : 'Sačuvaj'}</Text></>
                  )}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* ===== EVENT MODAL ===== */}
      <Modal visible={eventModalVisible} animationType="slide" transparent onRequestClose={() => setEventModalVisible(false)}>
        <View style={s.modalOuter}>
          <TouchableOpacity style={s.modalBg} onPress={() => setEventModalVisible(false)} activeOpacity={1} />
          <View testID="event-modal" style={[s.modalBox, { maxHeight: height * 0.7 }]}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Novi događaj</Text>
              <TouchableOpacity onPress={() => setEventModalVisible(false)}><Ionicons name="close" size={24} color={c.textSec} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.fldLbl}>Naslov *</Text>
              <TextInput testID="event-title-input" style={s.fldInput} value={editEvent.title} onChangeText={(v: string) => setEditEvent((p: any) => ({ ...p, title: v }))} placeholder="Npr: Dani šljive 2026" />
              <Text style={s.fldLbl}>Opis *</Text>
              <TextInput testID="event-desc-input" style={[s.fldInput, { height: 70, textAlignVertical: 'top' }]} value={editEvent.description} onChangeText={(v: string) => setEditEvent((p: any) => ({ ...p, description: v }))} placeholder="Opis događaja" multiline />
              <Text style={s.fldLbl}>Lokacija / Mjesto *</Text>
              <TextInput testID="event-location-input" style={s.fldInput} value={editEvent.location_name} onChangeText={(v: string) => setEditEvent((p: any) => ({ ...p, location_name: v }))} placeholder="Npr: Centar grada" />
              <View style={s.rowFld}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fldLbl}>Datum * (YYYY-MM-DD)</Text>
                  <TextInput testID="event-date-input" style={s.fldInput} value={editEvent.date} onChangeText={(v: string) => setEditEvent((p: any) => ({ ...p, date: v }))} placeholder="2026-09-15" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.fldLbl}>Vrijeme</Text>
                  <TextInput testID="event-time-input" style={s.fldInput} value={editEvent.time} onChangeText={(v: string) => setEditEvent((p: any) => ({ ...p, time: v }))} placeholder="18:00" />
                </View>
              </View>
              <TouchableOpacity testID="save-event-btn" style={s.saveLocBtn} onPress={saveEvent} disabled={savingEvent}>
                {savingEvent ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={s.saveLocBtnTxt}>Dodaj događaj</Text></>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== TOURISM MODAL ===== */}
      <Modal visible={tourModalVisible} animationType="slide" transparent onRequestClose={() => setTourModalVisible(false)}>
        <View style={s.modalOuter}>
          <TouchableOpacity style={s.modalBg} onPress={() => setTourModalVisible(false)} activeOpacity={1} />
          <View testID="tour-modal" style={[s.modalBox, { maxHeight: height * 0.7 }]}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>{isNewTour ? 'Nova znamenitost' : 'Uredi znamenitost'}</Text>
              <TouchableOpacity onPress={() => setTourModalVisible(false)}><Ionicons name="close" size={24} color={c.textSec} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.fldLbl}>Ime *</Text>
              <TextInput testID="tour-name-input" style={s.fldInput} value={editTour.name} onChangeText={(v: string) => setEditTour((p: any) => ({ ...p, name: v }))} placeholder="Npr: Gradačačka tvrđava" />
              <Text style={s.fldLbl}>Opis *</Text>
              <TextInput testID="tour-desc-input" style={[s.fldInput, { height: 80, textAlignVertical: 'top' }]} value={editTour.description} onChangeText={(v: string) => setEditTour((p: any) => ({ ...p, description: v }))} placeholder="Opis znamenitosti" multiline />
              <Text style={s.fldLbl}>Kategorija</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {['Historija', 'Priroda', 'Kultura', 'Religija', 'Sport', 'Ostalo'].map(cat => (
                  <TouchableOpacity key={cat} style={[s.catOpt, editTour.category === cat && s.catOptActive]}
                    onPress={() => setEditTour((p: any) => ({ ...p, category: cat }))}>
                    <Text style={[s.catOptTxt, editTour.category === cat && s.catOptTxtActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={s.rowFld}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fldLbl}>Latitude</Text>
                  <TextInput style={s.fldInput} value={String(editTour.latitude || '')} onChangeText={(v: string) => setEditTour((p: any) => ({ ...p, latitude: parseFloat(v) || 0 }))} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.fldLbl}>Longitude</Text>
                  <TextInput style={s.fldInput} value={String(editTour.longitude || '')} onChangeText={(v: string) => setEditTour((p: any) => ({ ...p, longitude: parseFloat(v) || 0 }))} keyboardType="numeric" />
                </View>
              </View>
              <TouchableOpacity testID="save-tour-btn" style={s.saveLocBtn} onPress={saveTour} disabled={savingTour}>
                {savingTour ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={s.saveLocBtnTxt}>{isNewTour ? 'Dodaj' : 'Sačuvaj'}</Text></>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== BUSINESS ACCOUNT MODAL ===== */}
      <Modal visible={bizModalVisible} animationType="slide" transparent onRequestClose={() => setBizModalVisible(false)}>
        <View style={s.modalOuter}>
          <TouchableOpacity style={s.modalBg} onPress={() => setBizModalVisible(false)} activeOpacity={1} />
          <View testID="biz-modal" style={[s.modalBox, { maxHeight: height * 0.65 }]}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Novi biznis nalog</Text>
              <TouchableOpacity onPress={() => setBizModalVisible(false)}><Ionicons name="close" size={24} color={c.textSec} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.fldLbl}>Ime biznisa *</Text>
              <TextInput testID="biz-name-input" style={s.fldInput} value={newBizName} onChangeText={setNewBizName} placeholder="Npr: Restoran Stari Grad" />
              <Text style={s.fldLbl}>Email *</Text>
              <TextInput testID="biz-email-input" style={s.fldInput} value={newBizEmail} onChangeText={setNewBizEmail} placeholder="biznis@email.com" keyboardType="email-address" autoCapitalize="none" />
              <Text style={s.fldLbl}>Lozinka *</Text>
              <TextInput testID="biz-password-input" style={s.fldInput} value={newBizPassword} onChangeText={setNewBizPassword} placeholder="Min. 6 znakova" secureTextEntry />
              <Text style={s.fldLbl}>Lokacija (odaberite) *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {locations.map(loc => (
                  <TouchableOpacity key={loc.id} style={[s.catOpt, newBizLocId === loc.id && s.catOptActive]}
                    onPress={() => setNewBizLocId(loc.id)}>
                    <Text style={[s.catOptTxt, newBizLocId === loc.id && s.catOptTxtActive]} numberOfLines={1}>{loc.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity testID="create-biz-btn" style={s.saveLocBtn} onPress={createBizAccount} disabled={savingBiz}>
                {savingBiz ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="person-add" size={20} color="#fff" /><Text style={s.saveLocBtnTxt}>Kreiraj nalog</Text></>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== CATEGORY MODAL ===== */}
      <Modal visible={catModalVisible} animationType="slide" transparent onRequestClose={() => setCatModalVisible(false)}>
        <View style={s.modalOuter}>
          <TouchableOpacity style={s.modalBg} onPress={() => setCatModalVisible(false)} activeOpacity={1} />
          <View testID="edit-category-modal" style={[s.modalBox, { maxHeight: height * 0.55 }]}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>{isNewCat ? 'Nova kategorija' : 'Uredi kategoriju'}</Text>
              <TouchableOpacity onPress={() => setCatModalVisible(false)}><Ionicons name="close" size={24} color={c.textSec} /></TouchableOpacity>
            </View>
            <Text style={s.fldLbl}>Ime kategorije *</Text>
            <TextInput testID="cat-name-input" style={s.fldInput} value={editCat.name} onChangeText={v => setEditCat(p => ({ ...p, name: v }))} placeholder="Npr: Frizerski Saloni" />
            <Text style={s.fldLbl}>Ikona (Ionicons ime)</Text>
            <TextInput testID="cat-icon-input" style={s.fldInput} value={editCat.icon} onChangeText={v => setEditCat(p => ({ ...p, icon: v }))} placeholder="Npr: cut, school, business" />
            <Text style={s.iconHint}>Dostupne ikone: restaurant, cart, car, cafe, medkit, water, cut, school, business, football, musical-notes, paw, home, construct, shirt...</Text>
            <Text style={s.fldLbl}>Boja</Text>
            <View style={s.colorRow}>
              {['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#E91E63','#9C27B0','#FF9800','#607D8B','#795548'].map(col => (
                <TouchableOpacity key={col} style={[s.colorDot, { backgroundColor: col }, editCat.color === col && s.colorDotActive]}
                  onPress={() => setEditCat(p => ({ ...p, color: col }))} />
              ))}
            </View>
            <TouchableOpacity testID="save-category-btn" style={s.saveLocBtn} onPress={saveCat} disabled={savingCat}>
              {savingCat ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={s.saveLocBtnTxt}>{isNewCat ? 'Dodaj' : 'Sačuvaj'}</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  // Login
  loginWrap: { flex: 1, paddingHorizontal: 32, alignItems: 'center' },
  backCircle: { position: 'absolute', top: 60, left: 24, width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border },
  loginIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border, marginBottom: 20 },
  loginTitle: { fontSize: 28, fontFamily: 'Outfit_700Bold', color: c.text },
  loginSub: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: c.textSec, marginTop: 4, marginBottom: 32 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 16 : 12, borderWidth: 1, borderColor: c.border, marginBottom: 14, width: '100%' },
  inputField: { flex: 1, fontSize: 15, fontFamily: 'Manrope_500Medium', color: c.text, marginLeft: 12 },
  errorTxt: { color: c.danger, fontSize: 14, fontFamily: 'Manrope_500Medium', marginBottom: 12 },
  loginBtn: { backgroundColor: c.primary, borderRadius: 14, paddingVertical: 16, width: '100%', alignItems: 'center', marginTop: 8 },
  loginBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
  headerL: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border, marginRight: 12 },
  headerTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: c.text },
  headerR: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnTxt: { color: '#fff', fontSize: 14, fontFamily: 'Manrope_700Bold', marginLeft: 4 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border },
  // Tabs
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 12, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11 },
  tabActive: { backgroundColor: c.primary },
  tabTxt: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: c.textSec, marginLeft: 5 },
  tabTxtActive: { color: '#fff' },
  // List
  list: { flex: 1, paddingHorizontal: 20 },
  stats: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
  statNum: { fontSize: 28, fontFamily: 'Outfit_700Bold', color: c.text },
  statLbl: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.textSec, marginTop: 4 },
  // Loc card
  locCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  locThumb: { width: 50, height: 50, borderRadius: 10, marginRight: 12 },
  locBody: { flex: 1 },
  locTopRow: { flexDirection: 'row', alignItems: 'center' },
  locName: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: c.text, flex: 1 },
  premBadge: { backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6 },
  premTxt: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.success },
  locCat: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: c.accent, marginTop: 2 },
  locAddr: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: c.textSec, marginTop: 1 },
  locImgCount: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.primary, marginTop: 2 },
  locActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  editBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border },
  delBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFE0E0' },
  // Notifications
  notifCard: { backgroundColor: c.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: c.border, marginBottom: 20 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  notifTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: c.text, marginLeft: 10 },
  notifDevices: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.textSec, marginBottom: 16 },
  fldLbl: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: c.textSec, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  fldInput: { backgroundColor: c.bg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: 'Manrope_500Medium', color: c.text, borderWidth: 1, borderColor: c.border },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.notif, borderRadius: 14, paddingVertical: 16, marginTop: 16 },
  sendBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold', marginLeft: 8 },
  historyTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: c.text, marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyTxt: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: c.textSec },
  historyCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyName: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: c.text, flex: 1 },
  historyDate: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: c.textSec },
  historyBody: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: c.textSec, marginTop: 6 },
  historyStats: { flexDirection: 'row', gap: 16, marginTop: 10 },
  historyStatTxt: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: c.textSec },
  // Settings
  settingsCard: { backgroundColor: c.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: c.border },
  settingsTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: c.text, marginBottom: 6 },
  settingsDesc: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: c.textSec, marginBottom: 14, lineHeight: 20 },
  saveSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary, borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  saveSetBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold', marginLeft: 8 },
  // Modal
  modalOuter: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalKb: { flex: 1, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 20, paddingHorizontal: 24, maxHeight: height * 0.88 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: c.text },
  // Images in modal
  imgSection: { marginBottom: 8 },
  imgScroll: { marginTop: 4 },
  imgThumbWrap: { position: 'relative', marginRight: 10 },
  imgThumb: { width: 80, height: 80, borderRadius: 12 },
  imgDelBtn: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: c.danger, justifyContent: 'center', alignItems: 'center' },
  imgAddBtn: { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: c.border, justifyContent: 'center', alignItems: 'center' },
  imgAddTxt: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: c.accent, marginTop: 2 },
  // Cat options
  catOpt: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: c.bg, marginRight: 8, borderWidth: 1, borderColor: c.border },
  catOptActive: { backgroundColor: c.primary, borderColor: c.primary },
  catOptTxt: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.text },
  catOptTxtActive: { color: '#fff' },
  rowFld: { flexDirection: 'row' },
  premToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingVertical: 8 },
  premToggleTxt: { fontSize: 15, fontFamily: 'Manrope_500Medium', color: c.text, marginLeft: 12 },
  saveLocBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent, borderRadius: 14, paddingVertical: 16, marginTop: 18 },
  saveLocBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold', marginLeft: 8 },
  // Category management
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  catHeaderTxt: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: c.textSec },
  addCatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  addCatBtnTxt: { color: '#fff', fontSize: 14, fontFamily: 'Manrope_700Bold', marginLeft: 4 },
  catCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  catColorDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  catCardBody: { flex: 1, marginLeft: 14 },
  catCardName: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: c.text },
  catCardIcon: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: c.textSec, marginTop: 2 },
  iconHint: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: c.textSec, marginTop: 4, marginBottom: 4, lineHeight: 16 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, marginBottom: 12 },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: c.text, borderWidth: 3 },
});
