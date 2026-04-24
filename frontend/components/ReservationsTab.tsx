import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  TextInput, ActivityIndicator, Image, Modal, KeyboardAvoidingView,
  Platform, Keyboard, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PURPLE = '#7C3AED';
const GREEN = '#10B981';
const ORANGE = '#F59E0B';

const C = {
  bg: '#F5F6FA', white: '#FFFFFF', purple: PURPLE, purpleLight: '#EDE9FE',
  text: '#111827', textSec: '#6B7280', textMute: '#9CA3AF', border: '#E5E7EB',
  green: GREEN, greenBg: '#D1FAE5', orange: ORANGE, orangeBg: '#FEF3C7',
  red: '#EF4444', redBg: '#FEE2E2', blue: '#3B82F6', blueBg: '#EFF6FF',
};

interface Location {
  id: string; name: string; category: string; address: string;
  phone?: string; working_hours?: string; avg_rating?: number; images?: string[];
}

interface Reservation {
  id: string; location_name: string; location_category: string;
  date: string; time: string; guests: number; status: string;
  special_requests?: string; created_at?: string;
}

const CAT_LABELS: Record<string, string> = { restaurant: 'Restoran', cafe: 'Kafić', prenociste: 'Prenoćište' };
const CAT_ICONS: Record<string, string> = { restaurant: 'restaurant', cafe: 'cafe', prenociste: 'bed' };
const CAT_COLORS: Record<string, string> = { restaurant: '#EF4444', cafe: '#F59E0B', prenociste: '#7C3AED' };
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Čeka potvrdu', color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' },
  confirmed: { label: 'Potvrđena', color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'Otkazana', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' },
  completed: { label: 'Završena', color: '#6B7280', bg: '#F3F4F6', icon: 'checkmark-done-outline' },
};

function generateDates(count = 14) {
  const days: { label: string; dayNum: string; dayName: string; value: string }[] = [];
  const DAYS = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  for (let i = 0; i < count; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const y = d.getFullYear(), mo = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
    days.push({ value: `${y}-${mo}-${da}`, dayNum: String(d.getDate()), dayName: i === 0 ? 'Danas' : DAYS[d.getDay()], label: `${d.getDate()} ${MONTHS[d.getMonth()]}` });
  }
  return days;
}

function generateTimes() {
  const slots: string[] = [];
  for (let h = 8; h <= 23; h++) { slots.push(`${String(h).padStart(2, '0')}:00`); if (h < 23) slots.push(`${String(h).padStart(2, '0')}:30`); }
  return slots;
}

function imgUri(img?: string) {
  if (!img) return undefined;
  if (img.startsWith('data:') || img.startsWith('http')) return img;
  return `${API}/api/uploads/${img}`;
}

function formatDateDisplay(dateStr: string) {
  try {
    const MONTHS = ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'augusta', 'septembra', 'oktobra', 'novembra', 'decembra'];
    const d = new Date(dateStr + 'T12:00:00');
    return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}.`;
  } catch { return dateStr; }
}

const DATES = generateDates(14);
const TIMES = generateTimes();

export default function ReservationsTab() {
  const insets = useSafeAreaInsets();
  const [mainTab, setMainTab] = useState<'nova' | 'moje'>('nova');
  // Steps: 'list' | 'form' | 'code' | 'success'
  const [step, setStep] = useState<'list' | 'form' | 'code' | 'success'>('list');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState<string>('');
  const [selectedLoc, setSelectedLoc] = useState<Location | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Form state
  const [fDate, setFDate] = useState(DATES[0]?.value || '');
  const [fTime, setFTime] = useState('');
  const [fGuests, setFGuests] = useState(2);
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fSpecial, setFSpecial] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Verification
  const [reservationId, setReservationId] = useState('');
  const [shownCode, setShownCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState('');

  // My reservations
  const [searchPhone, setSearchPhone] = useState('');
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      const data = await fetch(`${API}/api/reservations/locations`).then(r => r.json());
      setLocations(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const filteredLocs = catFilter ? locations.filter(l => l.category === catFilter) : locations;

  const handleSelectLoc = (loc: Location) => {
    setSelectedLoc(loc);
    setFDate(DATES[0]?.value || '');
    setFTime(''); setFGuests(2); setFName(''); setFPhone(''); setFEmail(''); setFSpecial('');
    setStep('form');
  };

  const handleSubmitForm = async () => {
    if (!fName.trim()) { Alert.alert('Greška', 'Unesite vaše ime.'); return; }
    if (!fPhone.trim() || fPhone.trim().length < 6) { Alert.alert('Greška', 'Unesite validan broj telefona.'); return; }
    if (!fDate) { Alert.alert('Greška', 'Odaberite datum.'); return; }
    if (!fTime) { Alert.alert('Greška', 'Odaberite vrijeme.'); return; }
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: selectedLoc!.id,
          customer_name: fName.trim(),
          customer_phone: fPhone.trim(),
          customer_email: fEmail.trim() || null,
          date: fDate,
          time: fTime,
          guests: fGuests,
          special_requests: fSpecial.trim() || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); Alert.alert('Greška', e.detail || 'Greška pri kreiranju rezervacije.'); return; }
      const data = await res.json();
      setReservationId(data.reservation_id);
      setShownCode(data.verification_code);
      setEnteredCode('');
      setCodeError('');
      setStep('code');
    } catch { Alert.alert('Greška', 'Serverska greška. Pokušajte ponovo.'); }
    finally { setSubmitting(false); }
  };

  const handleVerify = async () => {
    if (enteredCode.length !== 6) { setCodeError('Kod mora imati 6 cifara.'); return; }
    setVerifying(true); setCodeError('');
    try {
      const res = await fetch(`${API}/api/reservations/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, code: enteredCode }),
      });
      if (!res.ok) { const e = await res.json(); setCodeError(e.detail || 'Greška pri verifikaciji.'); return; }
      setStep('success');
    } catch { setCodeError('Serverska greška. Pokušajte ponovo.'); }
    finally { setVerifying(false); }
  };

  const handleSearchMy = async () => {
    if (searchPhone.trim().length < 6) { Alert.alert('Greška', 'Unesite validan broj telefona.'); return; }
    Keyboard.dismiss();
    setSearchLoading(true); setSearchDone(false);
    try {
      const data = await fetch(`${API}/api/my-reservations?phone=${encodeURIComponent(searchPhone.trim())}`).then(r => r.json());
      setMyReservations(Array.isArray(data) ? data : []);
    } catch { setMyReservations([]); }
    finally { setSearchLoading(false); setSearchDone(true); }
  };

  const resetToList = () => { setStep('list'); setSelectedLoc(null); };

  // ─── SCREENS ──────────────────────────────────────────────────────────────

  // List screen
  if (step === 'list') {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={s.header}>
          <Text style={s.headerTitle}>Rezervacije</Text>
          <View style={s.mainTabs}>
            {(['nova', 'moje'] as const).map(t => (
              <TouchableOpacity key={t} style={[s.mainTab, mainTab === t && s.mainTabActive]} onPress={() => setMainTab(t)}>
                <Text style={[s.mainTabTxt, mainTab === t && s.mainTabTxtActive]}>
                  {t === 'nova' ? '📅 Nova rezervacija' : '📋 Moje rezervacije'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {mainTab === 'nova' ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Category filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
              {[{ key: '', label: 'Sve' }, { key: 'restaurant', label: 'Restorani' }, { key: 'cafe', label: 'Kafići' }, { key: 'prenociste', label: 'Prenoćišta' }].map(f => (
                <TouchableOpacity key={f.key} style={[s.filterChip, catFilter === f.key && s.filterChipActive]} onPress={() => setCatFilter(f.key)}>
                  <Text style={[s.filterChipTxt, catFilter === f.key && s.filterChipTxtActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading ? (
              <View style={s.centerPad}><ActivityIndicator color={PURPLE} size="large" /></View>
            ) : filteredLocs.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                <Text style={s.emptyTxt}>Nema dostupnih lokacija</Text>
              </View>
            ) : filteredLocs.map(loc => {
              const catColor = CAT_COLORS[loc.category] || PURPLE;
              const catLabel = CAT_LABELS[loc.category] || loc.category;
              const catIcon = CAT_ICONS[loc.category] || 'location';
              const img = loc.images?.[0];
              return (
                <TouchableOpacity key={loc.id} style={s.locCard} onPress={() => handleSelectLoc(loc)} activeOpacity={0.85}>
                  <View style={s.locImgWrap}>
                    {img ? (
                      <Image source={{ uri: imgUri(img) }} style={s.locImg} resizeMode="cover" />
                    ) : (
                      <View style={[s.locImgPlaceholder, { backgroundColor: catColor + '20' }]}>
                        <Ionicons name={catIcon as any} size={32} color={catColor} />
                      </View>
                    )}
                    <View style={[s.catBadge, { backgroundColor: catColor }]}>
                      <Ionicons name={catIcon as any} size={11} color="#fff" />
                      <Text style={s.catBadgeTxt}>{catLabel}</Text>
                    </View>
                  </View>
                  <View style={s.locInfo}>
                    <Text style={s.locName} numberOfLines={1}>{loc.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Ionicons name="location-outline" size={12} color={C.textSec} />
                      <Text style={s.locAddr} numberOfLines={1}>{loc.address}</Text>
                    </View>
                    {loc.working_hours && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Ionicons name="time-outline" size={12} color={C.textSec} />
                        <Text style={s.locAddr} numberOfLines={1}>{loc.working_hours}</Text>
                      </View>
                    )}
                    <TouchableOpacity style={s.reserveBtn} onPress={() => handleSelectLoc(loc)}>
                      <Ionicons name="calendar-outline" size={14} color="#fff" />
                      <Text style={s.reserveBtnTxt}>Rezerviši sto / sobu</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          // My Reservations
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
              <Text style={s.sectionTitle}>Pretraga po broju telefona</Text>
              <View style={s.searchRow}>
                <TextInput
                  style={s.phoneInput}
                  placeholder="Npr. 061 123 456"
                  placeholderTextColor={C.textMute}
                  value={searchPhone}
                  onChangeText={setSearchPhone}
                  keyboardType="phone-pad"
                  returnKeyType="search"
                  onSubmitEditing={handleSearchMy}
                />
                <TouchableOpacity style={s.searchBtn} onPress={handleSearchMy} disabled={searchLoading}>
                  {searchLoading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={18} color="#fff" />}
                </TouchableOpacity>
              </View>
              {searchDone && (
                myReservations.length === 0 ? (
                  <View style={s.emptyBox}>
                    <Ionicons name="calendar-outline" size={44} color="#D1D5DB" />
                    <Text style={s.emptyTxt}>Nema rezervacija za ovaj broj</Text>
                    <Text style={{ fontSize: 13, color: C.textMute, marginTop: 6, textAlign: 'center' }}>Provjeri da li si unio/la tačan broj telefona</Text>
                  </View>
                ) : myReservations.map(r => {
                  const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const catIcon = CAT_ICONS[r.location_category] || 'location';
                  const catColor = CAT_COLORS[r.location_category] || PURPLE;
                  return (
                    <View key={r.id} style={s.myResCard}>
                      <View style={s.myResTop}>
                        <View style={[s.myResCatIcon, { backgroundColor: catColor + '20' }]}>
                          <Ionicons name={catIcon as any} size={18} color={catColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.myResName} numberOfLines={1}>{r.location_name}</Text>
                          <Text style={s.myResDate}>{formatDateDisplay(r.date)} u {r.time} · {r.guests} {r.guests === 1 ? 'osoba' : 'osobe/a'}</Text>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                          <Ionicons name={st.icon as any} size={12} color={st.color} />
                          <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>
                      {r.special_requests ? <Text style={s.myResSpecial}>📝 {r.special_requests}</Text> : null}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    );
  }

  // Form screen
  if (step === 'form' && selectedLoc) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={s.subHeader}>
          <TouchableOpacity onPress={resetToList} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={s.subHeaderTitle} numberOfLines={1}>{selectedLoc.name}</Text>
            <Text style={s.subHeaderSub}>{CAT_LABELS[selectedLoc.category] || selectedLoc.category}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
          {/* Date picker */}
          <Text style={s.label}>Datum *</Text>
          <FlatList
            data={DATES} keyExtractor={d => d.value} horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            renderItem={({ item: d }) => (
              <TouchableOpacity
                style={[s.dateChip, fDate === d.value && s.dateChipActive]}
                onPress={() => setFDate(d.value)}
              >
                <Text style={[s.dateDayName, fDate === d.value && s.dateTxtActive]}>{d.dayName}</Text>
                <Text style={[s.dateDayNum, fDate === d.value && s.dateTxtActive]}>{d.dayNum}</Text>
              </TouchableOpacity>
            )}
          />

          {/* Time picker */}
          <Text style={[s.label, { marginTop: 16 }]}>Vrijeme *</Text>
          <TouchableOpacity style={s.timeSelectBtn} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={18} color={fTime ? PURPLE : C.textMute} />
            <Text style={[s.timeSelectTxt, { color: fTime ? C.text : C.textMute }]}>{fTime || 'Odaberite vrijeme'}</Text>
            <Ionicons name="chevron-down" size={16} color={C.textMute} />
          </TouchableOpacity>

          {/* Guests */}
          <Text style={[s.label, { marginTop: 16 }]}>Broj osoba *</Text>
          <View style={s.guestsRow}>
            <TouchableOpacity style={s.guestBtn} onPress={() => setFGuests(g => Math.max(1, g - 1))}>
              <Ionicons name="remove" size={20} color={PURPLE} />
            </TouchableOpacity>
            <View style={s.guestCount}>
              <Text style={s.guestNum}>{fGuests}</Text>
              <Text style={s.guestLabel}>{fGuests === 1 ? 'osoba' : fGuests <= 4 ? 'osobe' : 'osoba'}</Text>
            </View>
            <TouchableOpacity style={s.guestBtn} onPress={() => setFGuests(g => Math.min(20, g + 1))}>
              <Ionicons name="add" size={20} color={PURPLE} />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={[s.label, { marginTop: 16 }]}>Vaše ime *</Text>
          <TextInput style={s.input} placeholder="Ime i prezime" placeholderTextColor={C.textMute}
            value={fName} onChangeText={setFName} returnKeyType="next" />

          {/* Phone */}
          <Text style={[s.label, { marginTop: 12 }]}>Broj telefona *</Text>
          <TextInput style={s.input} placeholder="Npr. 061 123 456" placeholderTextColor={C.textMute}
            value={fPhone} onChangeText={setFPhone} keyboardType="phone-pad" returnKeyType="next" />

          {/* Email (optional) */}
          <Text style={[s.label, { marginTop: 12 }]}>E-mail (opciono)</Text>
          <TextInput style={s.input} placeholder="vasa@email.com" placeholderTextColor={C.textMute}
            value={fEmail} onChangeText={setFEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />

          {/* Special requests */}
          <Text style={[s.label, { marginTop: 12 }]}>Posebni zahtjevi (opciono)</Text>
          <TextInput style={[s.input, s.textArea]} placeholder="Npr. sto kraj prozora, alergenije, rođendan..." placeholderTextColor={C.textMute}
            value={fSpecial} onChangeText={setFSpecial} multiline numberOfLines={3} textAlignVertical="top" />

          <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmitForm} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={s.submitTxt}>Pošalji rezervaciju</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Time picker modal */}
        <Modal visible={showTimePicker} transparent animationType="slide">
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
            <View style={[s.timeModal, { paddingBottom: insets.bottom + 20 }]}>
              <View style={s.timeModalHeader}>
                <Text style={s.timeModalTitle}>Odaberi vrijeme</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}><Ionicons name="close" size={22} color={C.text} /></TouchableOpacity>
              </View>
              <FlatList
                data={TIMES} keyExtractor={t => t}
                numColumns={4}
                contentContainerStyle={{ padding: 12, gap: 8 }}
                columnWrapperStyle={{ gap: 8 }}
                renderItem={({ item: t }) => (
                  <TouchableOpacity
                    style={[s.timeSlot, fTime === t && s.timeSlotActive]}
                    onPress={() => { setFTime(t); setShowTimePicker(false); }}
                  >
                    <Text style={[s.timeSlotTxt, fTime === t && s.timeSlotTxtActive]}>{t}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  // Verification code screen
  if (step === 'code') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={s.subHeader}>
          <TouchableOpacity onPress={() => setStep('form')} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[s.subHeaderTitle, { marginLeft: 8 }]}>Potvrda rezervacije</Text>
        </View>
        <ScrollView contentContainerStyle={s.codeCenter}>
          <View style={s.codeBox}>
            <View style={s.codeIconCircle}>
              <Ionicons name="shield-checkmark" size={40} color={PURPLE} />
            </View>
            <Text style={s.codeLabel}>Vaš verifikacioni kod</Text>
            <Text style={s.codeValue}>{shownCode}</Text>
            <Text style={s.codeNote}>⚠️ Zapišite ovaj kod! Važi 30 minuta.</Text>
          </View>

          <Text style={s.codeInstruction}>Unesite kod za potvrdu rezervacije:</Text>
          <TextInput
            style={[s.codeInput, codeError ? { borderColor: C.red } : {}]}
            placeholder="000000"
            placeholderTextColor={C.textMute}
            value={enteredCode}
            onChangeText={v => { setEnteredCode(v.replace(/\D/g, '').slice(0, 6)); setCodeError(''); }}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />
          {codeError ? <Text style={s.errorTxt}>{codeError}</Text> : null}

          <TouchableOpacity style={[s.submitBtn, verifying && { opacity: 0.7 }]} onPress={handleVerify} disabled={verifying}>
            {verifying ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.submitTxt}>Potvrdi rezervaciju</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelLink} onPress={resetToList}>
            <Text style={s.cancelLinkTxt}>Odustani i vrati se na popis</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Success screen
  if (step === 'success') {
    return (
      <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <StatusBar barStyle="dark-content" />
        <View style={s.successIcon}>
          <Ionicons name="checkmark-circle" size={72} color={GREEN} />
        </View>
        <Text style={s.successTitle}>Rezervacija verificirana!</Text>
        <Text style={s.successSub}>Vaša rezervacija je poslana lokaciji{selectedLoc ? ` "${selectedLoc.name}"` : ''}.</Text>
        <View style={s.successDetails}>
          <View style={s.successRow}>
            <Ionicons name="calendar-outline" size={16} color={PURPLE} />
            <Text style={s.successRowTxt}>{formatDateDisplay(fDate)} u {fTime}</Text>
          </View>
          <View style={s.successRow}>
            <Ionicons name="people-outline" size={16} color={PURPLE} />
            <Text style={s.successRowTxt}>{fGuests} {fGuests === 1 ? 'osoba' : 'osobe/a'}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: C.orangeBg, alignSelf: 'flex-start', marginTop: 8 }]}>
            <Ionicons name="time-outline" size={13} color={ORANGE} />
            <Text style={[s.statusTxt, { color: ORANGE }]}>Čeka potvrdu lokacije</Text>
          </View>
        </View>
        <TouchableOpacity style={[s.submitBtn, { marginTop: 24 }]} onPress={() => { resetToList(); setMainTab('moje'); setSearchPhone(fPhone); }}>
          <Ionicons name="list-outline" size={18} color="#fff" />
          <Text style={s.submitTxt}>Pregledaj moje rezervacije</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelLink} onPress={resetToList}>
          <Text style={s.cancelLinkTxt}>Vrati se na popis lokacija</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 0 },
  headerTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: C.text, marginBottom: 12 },
  mainTabs: { flexDirection: 'row', gap: 0 },
  mainTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  mainTabActive: { borderBottomColor: PURPLE },
  mainTabTxt: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: C.textSec },
  mainTabTxtActive: { color: PURPLE },
  filterRow: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  filterChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  filterChipTxt: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: C.textSec },
  filterChipTxtActive: { color: '#fff' },
  centerPad: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTxt: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: C.textSec, marginTop: 12 },
  locCard: { flexDirection: 'row', backgroundColor: C.white, marginHorizontal: 20, marginBottom: 12, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.border, elevation: 2 },
  locImgWrap: { width: 110, position: 'relative' },
  locImg: { width: 110, height: '100%' },
  locImgPlaceholder: { width: 110, height: '100%', minHeight: 120, justifyContent: 'center', alignItems: 'center' },
  catBadge: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  catBadgeTxt: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: '#fff' },
  locInfo: { flex: 1, padding: 14 },
  locName: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: C.text },
  locAddr: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: C.textSec },
  reserveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PURPLE, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10, alignSelf: 'flex-start' },
  reserveBtnTxt: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: '#fff' },
  // Sub-header
  subHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  subHeaderTitle: { fontSize: 17, fontFamily: 'Outfit_700Bold', color: C.text },
  subHeaderSub: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: C.textSec },
  // Form
  label: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: C.text, marginBottom: 8 },
  dateChip: { width: 56, borderRadius: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  dateChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  dateDayName: { fontSize: 10, fontFamily: 'Manrope_600SemiBold', color: C.textSec },
  dateDayNum: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: C.text, marginTop: 2 },
  dateTxtActive: { color: '#fff' },
  timeSelectBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  timeSelectTxt: { flex: 1, fontSize: 15, fontFamily: 'Manrope_500Medium' },
  guestsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  guestBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.purpleLight, justifyContent: 'center', alignItems: 'center' },
  guestCount: { flex: 1, alignItems: 'center' },
  guestNum: { fontSize: 32, fontFamily: 'Outfit_700Bold', color: C.text },
  guestLabel: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: C.textSec },
  input: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: 'Manrope_500Medium', color: C.text },
  textArea: { height: 88, paddingTop: 13 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PURPLE, borderRadius: 16, paddingVertical: 16, marginTop: 20 },
  submitTxt: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: '#fff' },
  // Time modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  timeModal: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  timeModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  timeModalTitle: { fontSize: 17, fontFamily: 'Outfit_700Bold', color: C.text },
  timeSlot: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  timeSlotActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  timeSlotTxt: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: C.text },
  timeSlotTxtActive: { color: '#fff' },
  // Code screen
  codeCenter: { padding: 24, paddingTop: 32 },
  codeBox: { backgroundColor: C.white, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 24 },
  codeIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.purpleLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  codeLabel: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: C.textSec, marginBottom: 10 },
  codeValue: { fontSize: 48, fontFamily: 'Outfit_700Bold', color: PURPLE, letterSpacing: 6 },
  codeNote: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: ORANGE, marginTop: 10, textAlign: 'center' },
  codeInstruction: { fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: C.text, marginBottom: 12 },
  codeInput: { backgroundColor: C.white, borderWidth: 2, borderColor: PURPLE, borderRadius: 16, paddingVertical: 16, fontSize: 28, fontFamily: 'Outfit_700Bold', color: C.text, letterSpacing: 8, textAlign: 'center' },
  errorTxt: { fontSize: 13, color: C.red, fontFamily: 'Manrope_500Medium', marginTop: 6, textAlign: 'center' },
  cancelLink: { paddingVertical: 14, alignItems: 'center' },
  cancelLinkTxt: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: C.textSec },
  // Success
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 26, fontFamily: 'Outfit_700Bold', color: C.text, textAlign: 'center', marginBottom: 10 },
  successSub: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: C.textSec, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  successDetails: { backgroundColor: C.white, borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: C.border },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  successRowTxt: { fontSize: 15, fontFamily: 'Manrope_500Medium', color: C.text },
  // My reservations
  sectionTitle: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: C.text, marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  phoneInput: { flex: 1, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: 'Manrope_500Medium', color: C.text },
  searchBtn: { width: 50, height: 50, backgroundColor: PURPLE, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  myResCard: { backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  myResTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  myResCatIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  myResName: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: C.text },
  myResDate: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: C.textSec, marginTop: 2 },
  myResSpecial: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: C.textSec, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusTxt: { fontSize: 11, fontFamily: 'Manrope_700Bold' },
});
