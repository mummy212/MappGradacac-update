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
  getItem: async (k: string) => { try { return Platform.OS === 'web' ? window.localStorage.getItem(k) : await AsyncStorage.getItem(k); } catch { return null; } },
  setItem: async (k: string, v: string) => { try { Platform.OS === 'web' ? window.localStorage.setItem(k, v) : await AsyncStorage.setItem(k, v); } catch {} },
  removeItem: async (k: string) => { try { Platform.OS === 'web' ? window.localStorage.removeItem(k) : await AsyncStorage.removeItem(k); } catch {} },
};

const { height } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const c = { bg: '#FAF9F6', surface: '#FFF', primary: '#4A5D4E', primaryFg: '#FFF', accent: '#D97757', text: '#1C1C1C', textSec: '#6B6B6B', border: '#E5E4E2', danger: '#E74C3C', success: '#27AE60', notif: '#3B82F6' };

export default function BusinessPanel() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  // Data
  const [location, setLocation] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totals: { views: 0, nav_clicks: 0, call_clicks: 0 } });
  const [tab, setTab] = useState<'profil'|'ponude'|'meni'|'poruke'|'stats'>('profil');
  // Modals
  const [offerModal, setOfferModal] = useState(false);
  const [menuModal, setMenuModal] = useState(false);
  const [newOffer, setNewOffer] = useState<any>({ title: '', description: '', discount_percent: '', expires_at: '' });
  const [newMenu, setNewMenu] = useState<any>({ name: '', price: '', description: '', category: 'Ostalo' });
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<any>({});

  const [fontsLoaded] = useFonts({ Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const saved = await Storage.getItem('biz_token');
    if (saved) { setToken(saved); fetchMe(saved); }
  };

  const fetchMe = async (t: string) => {
    try {
      const r = await axios.get(`${BACKEND}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
      if (r.data.role !== 'business' && r.data.role !== 'admin') { await Storage.removeItem('biz_token'); return; }
      setUser(r.data); setLoggedIn(true); loadAll(t, r.data.location_id);
    } catch { await Storage.removeItem('biz_token'); }
  };

  const handleLogin = async () => {
    setLoginLoading(true); setLoginError('');
    try {
      const r = await axios.post(`${BACKEND}/api/auth/login`, { email: email.toLowerCase(), password });
      if (r.data.role !== 'business' && r.data.role !== 'admin') { setLoginError('Ovaj nalog nema biznis pristup'); setLoginLoading(false); return; }
      setToken(r.data.token); await Storage.setItem('biz_token', r.data.token);
      setUser(r.data); setLoggedIn(true); loadAll(r.data.token, r.data.location_id);
    } catch (e: any) { setLoginError(e.response?.data?.detail || 'Greška'); }
    setLoginLoading(false);
  };

  const handleLogout = async () => { await Storage.removeItem('biz_token'); setLoggedIn(false); setToken(''); setUser(null); };

  const loadAll = async (t: string, lid: string) => {
    if (!lid) return;
    try {
      const [locR, offR, menuR, msgR, stR] = await Promise.all([
        axios.get(`${BACKEND}/api/locations/${lid}`),
        axios.get(`${BACKEND}/api/locations/${lid}/offers`),
        axios.get(`${BACKEND}/api/locations/${lid}/menu`),
        axios.get(`${BACKEND}/api/locations/${lid}/messages`),
        axios.get(`${BACKEND}/api/business/stats`, { headers: { Authorization: `Bearer ${t}` } }).catch(() => ({ data: { totals: {} } })),
      ]);
      setLocation(locR.data); setOffers(offR.data); setMenuItems(menuR.data); setMessages(msgR.data); setStats(stR.data);
      setProfileData({ description: locR.data.description || '', phone: locR.data.phone || '', working_hours: locR.data.working_hours || '' });
    } catch {}
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await axios.put(`${BACKEND}/api/business/profile`, profileData, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Uspjeh', 'Profil ažuriran'); setEditingProfile(false); loadAll(token, user.location_id);
    } catch { Alert.alert('Greška', 'Greška pri čuvanju'); }
    setSaving(false);
  };

  const createOffer = async () => {
    if (!newOffer.title || !newOffer.description) { Alert.alert('Greška', 'Naslov i opis su obavezni'); return; }
    setSaving(true);
    try {
      await axios.post(`${BACKEND}/api/business/offers`, { ...newOffer, location_id: user.location_id, discount_percent: newOffer.discount_percent ? parseInt(newOffer.discount_percent) : null }, { headers: { Authorization: `Bearer ${token}` } });
      setOfferModal(false); setNewOffer({ title: '', description: '', discount_percent: '', expires_at: '' }); loadAll(token, user.location_id);
    } catch (e: any) { Alert.alert('Greška', e.response?.data?.detail || 'Greška'); }
    setSaving(false);
  };

  const deleteOffer = (o: any) => Alert.alert('Brisanje', `Obrisati "${o.title}"?`, [{ text: 'Ne' }, { text: 'Da', style: 'destructive', onPress: async () => { try { await axios.delete(`${BACKEND}/api/business/offers/${o.id}`, { headers: { Authorization: `Bearer ${token}` } }); loadAll(token, user.location_id); } catch {} } }]);

  const createMenuItem = async () => {
    if (!newMenu.name || !newMenu.price) { Alert.alert('Greška', 'Ime i cijena su obavezni'); return; }
    setSaving(true);
    try {
      await axios.post(`${BACKEND}/api/business/menu?lid=${user.location_id}`, { ...newMenu, price: parseFloat(newMenu.price) }, { headers: { Authorization: `Bearer ${token}` } });
      setMenuModal(false); setNewMenu({ name: '', price: '', description: '', category: 'Ostalo' }); loadAll(token, user.location_id);
    } catch (e: any) { Alert.alert('Greška', e.response?.data?.detail || 'Greška'); }
    setSaving(false);
  };

  const deleteMenuItem = (m: any) => Alert.alert('Brisanje', `Obrisati "${m.name}"?`, [{ text: 'Ne' }, { text: 'Da', style: 'destructive', onPress: async () => { try { await axios.delete(`${BACKEND}/api/business/menu/${m.id}`, { headers: { Authorization: `Bearer ${token}` } }); loadAll(token, user.location_id); } catch {} } }]);

  const replyMsg = (msg: any) => {
    Alert.prompt?.('Odgovor', `Odgovorite na poruku od ${msg.sender_name}`, async (text: string) => {
      if (!text) return;
      try { await axios.put(`${BACKEND}/api/business/messages/${msg.id}/reply`, { sender_name: location?.name || 'Biznis', message: text }, { headers: { Authorization: `Bearer ${token}` } }); loadAll(token, user.location_id); } catch {}
    }) || Alert.alert('Odgovor', 'Funkcija odgovora dostupna na iOS uređaju');
  };

  if (!fontsLoaded) return null;

  // LOGIN
  if (!loggedIn) return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />
      <View style={[s.loginWrap, { paddingTop: insets.top + 40 }]}>
        <TouchableOpacity testID="back-biz-btn" style={s.backCircle} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={c.text} /></TouchableOpacity>
        <View style={s.loginIcon}><Ionicons name="storefront" size={48} color={c.accent} /></View>
        <Text style={s.loginTitle}>Biznis Panel</Text>
        <Text style={s.loginSub}>Prijava za komitente</Text>
        <View style={s.inputRow}><Ionicons name="mail-outline" size={20} color={c.textSec} /><TextInput testID="biz-email" style={s.inputField} placeholder="Email" placeholderTextColor={c.textSec} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /></View>
        <View style={s.inputRow}><Ionicons name="lock-closed-outline" size={20} color={c.textSec} /><TextInput testID="biz-password" style={s.inputField} placeholder="Lozinka" placeholderTextColor={c.textSec} value={password} onChangeText={setPassword} secureTextEntry /></View>
        {loginError ? <Text style={s.errorTxt}>{loginError}</Text> : null}
        <TouchableOpacity testID="biz-login-btn" style={s.loginBtn} onPress={handleLogin} disabled={loginLoading}>
          {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginBtnTxt}>Prijavi se</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // DASHBOARD
  return (
    <View testID="biz-dashboard" style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={c.text} /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>{location?.name || 'Biznis'}</Text>
          <Text style={s.headerSub}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}><Ionicons name="log-out-outline" size={20} color={c.danger} /></TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsWrap} contentContainerStyle={s.tabsContent}>
        {([['profil','person-outline','Profil'],['ponude','pricetag-outline','Ponude'],['meni','restaurant-outline','Meni'],['poruke','chatbubble-outline','Poruke'],['stats','stats-chart-outline','Stats']] as const).map(([id, icon, label]) => (
          <TouchableOpacity key={id} testID={`biz-tab-${id}`} style={[s.bizTab, tab === id && s.bizTabActive]} onPress={() => setTab(id as any)}>
            <Ionicons name={icon as any} size={16} color={tab === id ? '#fff' : c.textSec} />
            <Text style={[s.bizTabTxt, tab === id && s.bizTabTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        {/* PROFIL */}
        {tab === 'profil' && location && (
          <View>
            {location.images?.length > 0 && <Image source={{ uri: location.images[0] }} style={s.profileImg} />}
            <View style={s.card}>
              <Text style={s.cardTitle}>Informacije</Text>
              {editingProfile ? (
                <>
                  <Text style={s.fldLbl}>Opis</Text>
                  <TextInput style={[s.fldInput, { height: 80 }]} value={profileData.description} onChangeText={(v: string) => setProfileData((p: any) => ({ ...p, description: v }))} multiline />
                  <Text style={s.fldLbl}>Telefon</Text>
                  <TextInput style={s.fldInput} value={profileData.phone} onChangeText={(v: string) => setProfileData((p: any) => ({ ...p, phone: v }))} />
                  <Text style={s.fldLbl}>Radno vrijeme</Text>
                  <TextInput style={s.fldInput} value={profileData.working_hours} onChangeText={(v: string) => setProfileData((p: any) => ({ ...p, working_hours: v }))} />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <TouchableOpacity testID="save-profile-btn" style={[s.actionBtn, { backgroundColor: c.accent, flex: 1 }]} onPress={saveProfile}>
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.actionBtnTxt}>Sačuvaj</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.bg, flex: 1, borderWidth: 1, borderColor: c.border }]} onPress={() => setEditingProfile(false)}>
                      <Text style={[s.actionBtnTxt, { color: c.text }]}>Odustani</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <InfoRow icon="document-text-outline" label="Opis" value={location.description || '—'} />
                  <InfoRow icon="call-outline" label="Telefon" value={location.phone || '—'} />
                  <InfoRow icon="time-outline" label="Radno vrijeme" value={location.working_hours || '—'} />
                  <InfoRow icon="location-outline" label="Adresa" value={location.address} />
                  <TouchableOpacity testID="edit-profile-btn" style={[s.actionBtn, { backgroundColor: c.primary, marginTop: 14 }]} onPress={() => setEditingProfile(true)}>
                    <Text style={s.actionBtnTxt}>Uredi profil</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* PONUDE */}
        {tab === 'ponude' && (
          <View>
            <TouchableOpacity testID="add-biz-offer-btn" style={s.addItemBtn} onPress={() => setOfferModal(true)}>
              <Ionicons name="add-circle" size={22} color={c.accent} /><Text style={s.addItemTxt}>Nova ponuda / Novo u ponudi</Text>
            </TouchableOpacity>
            {offers.map(o => (
              <View key={o.id} testID={`biz-offer-${o.id}`} style={s.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>{o.title}</Text>
                  <Text style={s.itemDesc}>{o.description}</Text>
                  {o.discount_percent && <Text style={s.itemDiscount}>-{o.discount_percent}%</Text>}
                </View>
                <TouchableOpacity onPress={() => deleteOffer(o)}><Ionicons name="trash-outline" size={18} color={c.danger} /></TouchableOpacity>
              </View>
            ))}
            {offers.length === 0 && <Text style={s.emptyTxt}>Nemate aktivnih ponuda</Text>}
          </View>
        )}

        {/* MENI */}
        {tab === 'meni' && (
          <View>
            <TouchableOpacity testID="add-biz-menu-btn" style={s.addItemBtn} onPress={() => setMenuModal(true)}>
              <Ionicons name="add-circle" size={22} color={c.accent} /><Text style={s.addItemTxt}>Nova stavka menija</Text>
            </TouchableOpacity>
            {menuItems.map(m => (
              <View key={m.id} testID={`biz-menu-${m.id}`} style={s.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>{m.name}</Text>
                  {m.description && <Text style={s.itemDesc}>{m.description}</Text>}
                  <Text style={{ fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.accent }}>{m.category}</Text>
                </View>
                <Text style={s.menuPrice}>{m.price.toFixed(2)} KM</Text>
                <TouchableOpacity onPress={() => deleteMenuItem(m)} style={{ marginLeft: 8 }}><Ionicons name="trash-outline" size={18} color={c.danger} /></TouchableOpacity>
              </View>
            ))}
            {menuItems.length === 0 && <Text style={s.emptyTxt}>Meni je prazan</Text>}
          </View>
        )}

        {/* PORUKE */}
        {tab === 'poruke' && (
          <View>
            {messages.map(msg => (
              <View key={msg.id} testID={`biz-msg-${msg.id}`} style={s.msgCard}>
                <View style={s.msgHeader}>
                  <View style={s.msgAvatar}><Text style={s.msgAvatarTxt}>{msg.sender_name?.charAt(0)?.toUpperCase()}</Text></View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.msgName}>{msg.sender_name}</Text>
                    <Text style={s.msgDate}>{new Date(msg.created_at).toLocaleDateString('bs-BA')}</Text>
                  </View>
                </View>
                <Text style={s.msgText}>{msg.message}</Text>
                {msg.reply ? (
                  <View style={s.replyBox}><Text style={s.replyLabel}>Vaš odgovor:</Text><Text style={s.replyText}>{msg.reply}</Text></View>
                ) : (
                  <TouchableOpacity style={s.replyBtn} onPress={() => replyMsg(msg)}><Ionicons name="arrow-undo" size={14} color={c.notif} /><Text style={s.replyBtnTxt}>Odgovori</Text></TouchableOpacity>
                )}
              </View>
            ))}
            {messages.length === 0 && <Text style={s.emptyTxt}>Nema poruka</Text>}
          </View>
        )}

        {/* STATISTIKE */}
        {tab === 'stats' && (
          <View>
            <View style={s.statsGrid}>
              <StatBox icon="eye-outline" label="Pregledi" value={stats.totals?.views || 0} color={c.notif} />
              <StatBox icon="navigate-outline" label="Navigacija" value={stats.totals?.nav_clicks || 0} color={c.success} />
              <StatBox icon="call-outline" label="Pozivi" value={stats.totals?.call_clicks || 0} color={c.accent} />
            </View>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* OFFER MODAL */}
      <Modal visible={offerModal} animationType="slide" transparent onRequestClose={() => setOfferModal(false)}>
        <View style={s.modalOuter}>
          <TouchableOpacity style={s.modalBg} onPress={() => setOfferModal(false)} activeOpacity={1} />
          <View testID="biz-offer-modal" style={s.modalBox}>
            <Text style={s.modalTitle}>Nova ponuda</Text>
            <Text style={s.fldLbl}>Naslov *</Text><TextInput testID="biz-offer-title" style={s.fldInput} value={newOffer.title} onChangeText={(v: string) => setNewOffer((p: any) => ({ ...p, title: v }))} placeholder="Npr: Novo - Pizza Margherita" />
            <Text style={s.fldLbl}>Opis *</Text><TextInput testID="biz-offer-desc" style={[s.fldInput, { height: 60 }]} value={newOffer.description} onChangeText={(v: string) => setNewOffer((p: any) => ({ ...p, description: v }))} placeholder="Opis ponude" multiline />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Text style={s.fldLbl}>Popust %</Text><TextInput style={s.fldInput} value={newOffer.discount_percent} onChangeText={(v: string) => setNewOffer((p: any) => ({ ...p, discount_percent: v }))} keyboardType="numeric" placeholder="20" /></View>
              <View style={{ flex: 1 }}><Text style={s.fldLbl}>Ističe</Text><TextInput style={s.fldInput} value={newOffer.expires_at} onChangeText={(v: string) => setNewOffer((p: any) => ({ ...p, expires_at: v }))} placeholder="2026-12-31" /></View>
            </View>
            <TouchableOpacity testID="save-biz-offer" style={[s.actionBtn, { backgroundColor: c.accent, marginTop: 16 }]} onPress={createOffer} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.actionBtnTxt}>Dodaj ponudu</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MENU MODAL */}
      <Modal visible={menuModal} animationType="slide" transparent onRequestClose={() => setMenuModal(false)}>
        <View style={s.modalOuter}>
          <TouchableOpacity style={s.modalBg} onPress={() => setMenuModal(false)} activeOpacity={1} />
          <View testID="biz-menu-modal" style={s.modalBox}>
            <Text style={s.modalTitle}>Nova stavka menija</Text>
            <Text style={s.fldLbl}>Naziv *</Text><TextInput testID="biz-menu-name" style={s.fldInput} value={newMenu.name} onChangeText={(v: string) => setNewMenu((p: any) => ({ ...p, name: v }))} placeholder="Npr: Ćevapi 10 kom" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Text style={s.fldLbl}>Cijena (KM) *</Text><TextInput style={s.fldInput} value={newMenu.price} onChangeText={(v: string) => setNewMenu((p: any) => ({ ...p, price: v }))} keyboardType="numeric" placeholder="8.00" /></View>
              <View style={{ flex: 1 }}><Text style={s.fldLbl}>Kategorija</Text><TextInput style={s.fldInput} value={newMenu.category} onChangeText={(v: string) => setNewMenu((p: any) => ({ ...p, category: v }))} placeholder="Jela, Pića..." /></View>
            </View>
            <Text style={s.fldLbl}>Opis</Text><TextInput style={s.fldInput} value={newMenu.description} onChangeText={(v: string) => setNewMenu((p: any) => ({ ...p, description: v }))} placeholder="Kratki opis" />
            <TouchableOpacity testID="save-biz-menu" style={[s.actionBtn, { backgroundColor: c.accent, marginTop: 16 }]} onPress={createMenuItem} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.actionBtnTxt}>Dodaj na meni</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
      <Ionicons name={icon} size={18} color={c.primary} style={{ marginTop: 2 }} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: c.textSec }}>{label}</Text>
        <Text style={{ fontSize: 14, fontFamily: 'Manrope_400Regular', color: c.text, marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

function StatBox({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: color + '0C', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: color + '20' }}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={{ fontSize: 24, fontFamily: 'Outfit_700Bold', color: c.text, marginTop: 8 }}>{value}</Text>
      <Text style={{ fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.textSec, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  loginWrap: { flex: 1, paddingHorizontal: 32, alignItems: 'center' },
  backCircle: { position: 'absolute', top: 60, left: 24, width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border },
  loginIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border, marginBottom: 20 },
  loginTitle: { fontSize: 28, fontFamily: 'Outfit_700Bold', color: c.text },
  loginSub: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: c.textSec, marginTop: 4, marginBottom: 32 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 16 : 12, borderWidth: 1, borderColor: c.border, marginBottom: 14, width: '100%' },
  inputField: { flex: 1, fontSize: 15, fontFamily: 'Manrope_500Medium', color: c.text, marginLeft: 12 },
  errorTxt: { color: c.danger, fontSize: 14, fontFamily: 'Manrope_500Medium', marginBottom: 12 },
  loginBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 16, width: '100%', alignItems: 'center', marginTop: 8 },
  loginBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: c.text },
  headerSub: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: c.textSec },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border },
  // Tabs
  tabsWrap: { borderBottomWidth: 1, borderBottomColor: c.border },
  tabsContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  bizTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  bizTabActive: { backgroundColor: c.primary, borderColor: c.primary },
  bizTabTxt: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.textSec, marginLeft: 6 },
  bizTabTxtActive: { color: '#fff' },
  // Body
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  profileImg: { width: '100%', height: 160, borderRadius: 16, marginBottom: 16 },
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: c.border, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: c.text, marginBottom: 14 },
  fldLbl: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: c.textSec, textTransform: 'uppercase', marginBottom: 4, marginTop: 10 },
  fldInput: { backgroundColor: c.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: 'Manrope_500Medium', color: c.text, borderWidth: 1, borderColor: c.border },
  actionBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  actionBtnTxt: { color: '#fff', fontSize: 15, fontFamily: 'Manrope_700Bold' },
  // Items
  addItemBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.accent + '0C', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: c.accent + '25', borderStyle: 'dashed' },
  addItemTxt: { fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: c.accent, marginLeft: 10 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  itemTitle: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: c.text },
  itemDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: c.textSec, marginTop: 2 },
  itemDiscount: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: c.accent, marginTop: 4 },
  menuPrice: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: c.primary },
  emptyTxt: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: c.textSec, textAlign: 'center', paddingVertical: 32 },
  // Messages
  msgCard: { backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  msgHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center' },
  msgAvatarTxt: { color: '#fff', fontSize: 14, fontFamily: 'Outfit_700Bold' },
  msgName: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.text },
  msgDate: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: c.textSec },
  msgText: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: c.text, lineHeight: 20 },
  replyBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
  replyLabel: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: c.success },
  replyText: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: c.text, marginTop: 2 },
  replyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 6 },
  replyBtnTxt: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.notif, marginLeft: 4 },
  // Stats
  statsGrid: { flexDirection: 'row', gap: 10 },
  // Modal
  modalOuter: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalBox: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: c.text, marginBottom: 8 },
});
