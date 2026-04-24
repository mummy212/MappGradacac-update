import React, { useState, useEffect, useCallback } from 'react';
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
const BLUE = '#3B82F6';

const C = {
  bg: '#F5F6FA', white: '#FFFFFF', purple: PURPLE, purpleLight: '#EDE9FE',
  text: '#111827', textSec: '#6B7280', textMute: '#9CA3AF', border: '#E5E7EB',
  green: GREEN, greenBg: '#D1FAE5', orange: ORANGE, orangeBg: '#FEF3C7',
  red: '#EF4444', redBg: '#FEE2E2', blue: BLUE, blueBg: '#EFF6FF',
};

interface Location {
  id: string; name: string; category: string; address: string;
  phone?: string; working_hours?: string; images?: string[];
}

interface Reservation {
  id: string; location_name: string; location_category: string;
  reservation_type: string;
  date?: string; time?: string; table_preference?: string;
  check_in_date?: string; check_out_date?: string; room_type?: string; bed_type?: string;
  guests: number; status: string; special_requests?: string; created_at?: string;
}

const CAT_LABELS: Record<string, string> = { restaurant: 'Restoran', cafe: 'Kafić', prenociste: 'Prenoćište' };
const CAT_ICONS: Record<string, string> = { restaurant: 'restaurant', cafe: 'cafe', prenociste: 'bed' };
const CAT_COLORS: Record<string, string> = { restaurant: '#EF4444', cafe: '#F59E0B', prenociste: '#7C3AED' };
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Čeka potvrdu', color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' },
  confirmed: { label: 'Potvrđena',    color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'Otkazana',     color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' },
  completed: { label: 'Završena',     color: '#6B7280', bg: '#F3F4F6', icon: 'checkmark-done-outline' },
};
const ROOM_LABELS: Record<string, string> = { soba: 'Soba', apartman: 'Apartman', studio: 'Studio' };
const BED_LABELS: Record<string, string> = {
  jedan_krevet: 'Jedan krevet',
  dva_kreveta: 'Dva odvojena kreveta',
  bracni_krevet: 'Bračni krevet',
};
const TABLE_PREF_LABELS: Record<string, string> = { unutra: 'Unutra', vani: 'Vani', svejedno: 'Svejedno' };

function generateDates(count = 30, startOffset = 0) {
  const days: { dayNum: string; dayName: string; value: string }[] = [];
  const DAYS = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
  for (let i = startOffset; i < startOffset + count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const y = d.getFullYear(), mo = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
    days.push({ value: `${y}-${mo}-${da}`, dayNum: String(d.getDate()), dayName: i === 0 ? 'Danas' : DAYS[d.getDay()] });
  }
  return days;
}

function generateTimes() {
  const slots: string[] = [];
  for (let h = 8; h <= 23; h++) { slots.push(`${String(h).padStart(2, '0')}:00`); if (h < 23) slots.push(`${String(h).padStart(2, '0')}:30`); }
  return slots;
}

function calcNights(ci: string, co: string): number {
  try {
    const d1 = new Date(ci + 'T12:00:00'), d2 = new Date(co + 'T12:00:00');
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
  } catch { return 1; }
}

function imgUri(img?: string) {
  if (!img) return undefined;
  if (img.startsWith('data:') || img.startsWith('http')) return img;
  return `${API}/api/uploads/${img}`;
}

function formatDateShort(dateStr?: string) {
  if (!dateStr) return '';
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
  } catch { return dateStr; }
}

const ALL_DATES = generateDates(30);
const TIMES = generateTimes();
const isHotel = (cat: string) => cat === 'prenociste';

// ─── Date picker strip ────────────────────────────────────────────────────────
function DateStrip({ dates, selected, onSelect }: { dates: typeof ALL_DATES; selected: string; onSelect: (v: string) => void }) {
  return (
    <FlatList
      data={dates}
      keyExtractor={d => d.value}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
      renderItem={({ item: d }) => (
        <TouchableOpacity
          style={[s.dateChip, selected === d.value && s.dateChipActive]}
          onPress={() => onSelect(d.value)}
        >
          <Text style={[s.dateDayName, selected === d.value && s.dateTxtActive]}>{d.dayName}</Text>
          <Text style={[s.dateDayNum, selected === d.value && s.dateTxtActive]}>{d.dayNum}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

// ─── Option pills row ─────────────────────────────────────────────────────────
function OptionPills({ options, selected, onSelect }: {
  options: { key: string; label: string; icon?: string }[];
  selected: string;
  onSelect: (k: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => (
        <TouchableOpacity
          key={o.key}
          style={[s.optPill, selected === o.key && s.optPillActive]}
          onPress={() => onSelect(o.key)}
        >
          {o.icon ? <Text style={{ fontSize: 14 }}>{o.icon}</Text> : null}
          <Text style={[s.optPillTxt, selected === o.key && s.optPillTxtActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ReservationsTab() {
  const insets = useSafeAreaInsets();
  const [mainTab, setMainTab] = useState<'nova' | 'moje'>('nova');
  const [step, setStep] = useState<'list' | 'form' | 'code' | 'success'>('list');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [selectedLoc, setSelectedLoc] = useState<Location | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Common form
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fGuests, setFGuests] = useState(2);
  const [fSpecial, setFSpecial] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Restaurant/Cafe form
  const [fDate, setFDate] = useState(ALL_DATES[0]?.value || '');
  const [fTime, setFTime] = useState('');
  const [fTablePref, setFTablePref] = useState('svejedno');

  // Hotel form
  const [fCheckIn, setFCheckIn] = useState(ALL_DATES[0]?.value || '');
  const [fCheckOut, setFCheckOut] = useState(ALL_DATES[1]?.value || '');
  const [fRoomType, setFRoomType] = useState('');
  const [fBedType, setFBedType] = useState('');

  // Checkout dates - regenerate when check-in changes
  const checkoutDates = React.useMemo(() => {
    const idx = ALL_DATES.findIndex(d => d.value === fCheckIn);
    return generateDates(30, idx >= 0 ? idx + 1 : 1);
  }, [fCheckIn]);

  // Verification
  const [reservationId, setReservationId] = useState('');
  const [shownCode, setShownCode] = useState('');
  const [showCodeInApp, setShowCodeInApp] = useState(true);
  const [sentVia, setSentVia] = useState<string | null>(null);
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

  // Ensure checkout is after checkin
  useEffect(() => {
    if (fCheckOut <= fCheckIn) {
      const next = checkoutDates[0];
      if (next) setFCheckOut(next.value);
    }
  }, [fCheckIn]);

  const filteredLocs = catFilter ? locations.filter(l => l.category === catFilter) : locations;
  const nights = calcNights(fCheckIn, fCheckOut);
  const isHotelForm = selectedLoc ? isHotel(selectedLoc.category) : false;

  const handleSelectLoc = (loc: Location) => {
    setSelectedLoc(loc);
    setFDate(ALL_DATES[0]?.value || '');
    setFCheckIn(ALL_DATES[0]?.value || '');
    setFCheckOut(ALL_DATES[1]?.value || '');
    setFTime(''); setFGuests(2); setFName(''); setFPhone(''); setFEmail('');
    setFSpecial(''); setFTablePref('svejedno'); setFRoomType(''); setFBedType('');
    setStep('form');
  };

  const handleSubmitForm = async () => {
    if (!fName.trim()) { Alert.alert('Greška', 'Unesite vaše ime.'); return; }
    if (fPhone.trim().length < 6) { Alert.alert('Greška', 'Unesite validan broj telefona.'); return; }
    if (isHotelForm) {
      if (!fRoomType) { Alert.alert('Greška', 'Odaberite tip smještaja.'); return; }
      if (!fBedType) { Alert.alert('Greška', 'Odaberite tip kreveta.'); return; }
    } else {
      if (!fDate) { Alert.alert('Greška', 'Odaberite datum.'); return; }
      if (!fTime) { Alert.alert('Greška', 'Odaberite vrijeme.'); return; }
    }
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      const body = isHotelForm ? {
        location_id: selectedLoc!.id, reservation_type: 'room',
        check_in_date: fCheckIn, check_out_date: fCheckOut,
        room_type: fRoomType, bed_type: fBedType,
        guests: fGuests, customer_name: fName.trim(),
        customer_phone: fPhone.trim(), customer_email: fEmail.trim() || null,
        special_requests: fSpecial.trim() || null,
      } : {
        location_id: selectedLoc!.id, reservation_type: 'table',
        date: fDate, time: fTime, table_preference: fTablePref,
        guests: fGuests, customer_name: fName.trim(),
        customer_phone: fPhone.trim(), customer_email: fEmail.trim() || null,
        special_requests: fSpecial.trim() || null,
      };
      const res = await fetch(`${API}/api/reservations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); Alert.alert('Greška', e.detail || 'Greška pri kreiranju rezervacije.'); return; }
      const data = await res.json();
      setReservationId(data.reservation_id);
      setShownCode(data.verification_code || '');
      setShowCodeInApp(data.show_code !== false);
      setSentVia(data.sent_via || null);
      setEnteredCode(''); setCodeError('');
      setStep('code');
    } catch { Alert.alert('Greška', 'Serverska greška. Pokušajte ponovo.'); }
    finally { setSubmitting(false); }
  };

  const handleVerify = async () => {
    if (enteredCode.length !== 6) { setCodeError('Kod mora imati 6 cifara.'); return; }
    setVerifying(true); setCodeError('');
    try {
      const res = await fetch(`${API}/api/reservations/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, code: enteredCode }),
      });
      if (!res.ok) { const e = await res.json(); setCodeError(e.detail || 'Greška pri verifikaciji.'); return; }
      setStep('success');
    } catch { setCodeError('Serverska greška. Pokušajte ponovo.'); }
    finally { setVerifying(false); }
  };

  const handleSearchMy = async () => {
    if (searchPhone.trim().length < 6) { Alert.alert('Greška', 'Unesite validan broj telefona.'); return; }
    Keyboard.dismiss(); setSearchLoading(true); setSearchDone(false);
    try {
      const data = await fetch(`${API}/api/my-reservations?phone=${encodeURIComponent(searchPhone.trim())}`).then(r => r.json());
      setMyReservations(Array.isArray(data) ? data : []);
    } catch { setMyReservations([]); }
    finally { setSearchLoading(false); setSearchDone(true); }
  };

  const resetToList = () => { setStep('list'); setSelectedLoc(null); };

  // ─── LIST SCREEN ──────────────────────────────────────────────────────────
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
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
              {[{ key: '', label: 'Sve' }, { key: 'restaurant', label: '🍽️ Restorani' }, { key: 'cafe', label: '☕ Kafići' }, { key: 'prenociste', label: '🏨 Prenoćišta' }].map(f => (
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
              const isHotelLoc = isHotel(loc.category);
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
                        <Text style={s.locAddr}>{loc.working_hours}</Text>
                      </View>
                    )}
                    <TouchableOpacity style={[s.reserveBtn, { backgroundColor: catColor }]} onPress={() => handleSelectLoc(loc)}>
                      <Ionicons name={isHotelLoc ? 'bed-outline' : 'restaurant-outline'} size={13} color="#fff" />
                      <Text style={s.reserveBtnTxt}>{isHotelLoc ? 'Rezerviši sobu' : 'Rezerviši sto'}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
              <Text style={s.sectionTitle}>Pretraga po broju telefona</Text>
              <View style={s.searchRow}>
                <TextInput style={s.phoneInput} placeholder="Npr. 061 123 456" placeholderTextColor={C.textMute}
                  value={searchPhone} onChangeText={setSearchPhone} keyboardType="phone-pad"
                  returnKeyType="search" onSubmitEditing={handleSearchMy} />
                <TouchableOpacity style={s.searchBtn} onPress={handleSearchMy} disabled={searchLoading}>
                  {searchLoading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={18} color="#fff" />}
                </TouchableOpacity>
              </View>
              {searchDone && (
                myReservations.length === 0 ? (
                  <View style={s.emptyBox}>
                    <Ionicons name="calendar-outline" size={44} color="#D1D5DB" />
                    <Text style={s.emptyTxt}>Nema rezervacija za ovaj broj</Text>
                  </View>
                ) : myReservations.map(r => {
                  const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const isRoom = r.reservation_type === 'room';
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
                          {isRoom ? (
                            <Text style={s.myResDate}>
                              {formatDateShort(r.check_in_date)} → {formatDateShort(r.check_out_date)}
                              {'  ·  '}{ROOM_LABELS[r.room_type || ''] || ''}
                              {'  ·  '}{BED_LABELS[r.bed_type || ''] || ''}
                            </Text>
                          ) : (
                            <Text style={s.myResDate}>
                              {formatDateShort(r.date)} u {r.time}{'  ·  '}{r.guests} {r.guests === 1 ? 'osoba' : 'osobe/a'}
                            </Text>
                          )}
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

  // ─── FORM SCREEN ──────────────────────────────────────────────────────────
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
            <Text style={s.subHeaderSub}>{CAT_LABELS[selectedLoc.category]} · {isHotelForm ? 'Rezervacija smještaja' : 'Rezervacija stola'}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>

          {isHotelForm ? (
            // ── HOTEL FORM ──────────────────────────────────────────────────
            <>
              {/* Check-in date */}
              <Text style={s.label}>📅 Datum dolaska *</Text>
              <DateStrip dates={ALL_DATES} selected={fCheckIn} onSelect={v => { setFCheckIn(v); }} />

              {/* Check-out date */}
              <Text style={[s.label, { marginTop: 16 }]}>📅 Datum odlaska *</Text>
              <DateStrip dates={checkoutDates} selected={fCheckOut} onSelect={setFCheckOut} />

              {/* Nights count */}
              <View style={s.nightsBadge}>
                <Ionicons name="moon-outline" size={15} color={PURPLE} />
                <Text style={s.nightsTxt}>
                  {nights} {nights === 1 ? 'noć' : nights < 5 ? 'noći' : 'noći'} · {formatDateShort(fCheckIn)} – {formatDateShort(fCheckOut)}
                </Text>
              </View>

              {/* Room type */}
              <Text style={[s.label, { marginTop: 16 }]}>🏠 Tip smještaja *</Text>
              <OptionPills
                options={[{ key: 'soba', label: 'Soba', icon: '🛏️' }, { key: 'apartman', label: 'Apartman', icon: '🏠' }, { key: 'studio', label: 'Studio', icon: '🏢' }]}
                selected={fRoomType} onSelect={setFRoomType}
              />

              {/* Bed type */}
              <Text style={[s.label, { marginTop: 16 }]}>🛏 Tip kreveta *</Text>
              <OptionPills
                options={[
                  { key: 'jedan_krevet', label: 'Jedan krevet', icon: '🛏' },
                  { key: 'dva_kreveta', label: 'Dva odvojena kreveta', icon: '🛏🛏' },
                  { key: 'bracni_krevet', label: 'Bračni krevet', icon: '💑' },
                ]}
                selected={fBedType} onSelect={setFBedType}
              />

              {/* Guests */}
              <Text style={[s.label, { marginTop: 16 }]}>👥 Broj gostiju *</Text>
              <View style={s.guestsRow}>
                <TouchableOpacity style={s.guestBtn} onPress={() => setFGuests(g => Math.max(1, g - 1))}>
                  <Ionicons name="remove" size={20} color={PURPLE} />
                </TouchableOpacity>
                <View style={s.guestCount}>
                  <Text style={s.guestNum}>{fGuests}</Text>
                  <Text style={s.guestLabel}>{fGuests === 1 ? 'gost' : 'gosta/a'}</Text>
                </View>
                <TouchableOpacity style={s.guestBtn} onPress={() => setFGuests(g => Math.min(20, g + 1))}>
                  <Ionicons name="add" size={20} color={PURPLE} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // ── RESTAURANT/CAFE FORM ─────────────────────────────────────────
            <>
              {/* Date */}
              <Text style={s.label}>📅 Datum *</Text>
              <DateStrip dates={ALL_DATES} selected={fDate} onSelect={setFDate} />

              {/* Time */}
              <Text style={[s.label, { marginTop: 16 }]}>🕐 Vrijeme *</Text>
              <TouchableOpacity style={s.timeSelectBtn} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={18} color={fTime ? PURPLE : C.textMute} />
                <Text style={[s.timeSelectTxt, { color: fTime ? C.text : C.textMute }]}>{fTime || 'Odaberite vrijeme'}</Text>
                <Ionicons name="chevron-down" size={16} color={C.textMute} />
              </TouchableOpacity>

              {/* Guests */}
              <Text style={[s.label, { marginTop: 16 }]}>👥 Broj mjesta *</Text>
              <View style={s.guestsRow}>
                <TouchableOpacity style={s.guestBtn} onPress={() => setFGuests(g => Math.max(1, g - 1))}>
                  <Ionicons name="remove" size={20} color={PURPLE} />
                </TouchableOpacity>
                <View style={s.guestCount}>
                  <Text style={s.guestNum}>{fGuests}</Text>
                  <Text style={s.guestLabel}>{fGuests === 1 ? 'osoba' : 'osoba/a'}</Text>
                </View>
                <TouchableOpacity style={s.guestBtn} onPress={() => setFGuests(g => Math.min(20, g + 1))}>
                  <Ionicons name="add" size={20} color={PURPLE} />
                </TouchableOpacity>
              </View>

              {/* Table preference */}
              <Text style={[s.label, { marginTop: 16 }]}>🪑 Preferencija stola</Text>
              <OptionPills
                options={[
                  { key: 'unutra', label: 'Unutra', icon: '🏠' },
                  { key: 'vani', label: 'Vani / Terasa', icon: '🌿' },
                  { key: 'svejedno', label: 'Svejedno', icon: '🤷' },
                ]}
                selected={fTablePref} onSelect={setFTablePref}
              />
            </>
          )}

          {/* Common fields */}
          <Text style={[s.label, { marginTop: 20 }]}>Vaše ime *</Text>
          <TextInput style={s.input} placeholder="Ime i prezime" placeholderTextColor={C.textMute}
            value={fName} onChangeText={setFName} returnKeyType="next" />

          <Text style={[s.label, { marginTop: 12 }]}>Broj telefona *</Text>
          <TextInput style={s.input} placeholder="Npr. 061 123 456" placeholderTextColor={C.textMute}
            value={fPhone} onChangeText={setFPhone} keyboardType="phone-pad" returnKeyType="next" />

          <Text style={[s.label, { marginTop: 12 }]}>E-mail (opciono)</Text>
          <TextInput style={s.input} placeholder="vasa@email.com" placeholderTextColor={C.textMute}
            value={fEmail} onChangeText={setFEmail} keyboardType="email-address" autoCapitalize="none" />

          <Text style={[s.label, { marginTop: 12 }]}>Posebni zahtjevi (opciono)</Text>
          <TextInput style={[s.input, s.textArea]}
            placeholder={isHotelForm
              ? 'Npr. soba na višem spratu, dječiji krevetić, parking...'
              : 'Npr. sto kraj prozora, alergije, proslava...'}
            placeholderTextColor={C.textMute}
            value={fSpecial} onChangeText={setFSpecial} multiline numberOfLines={3} textAlignVertical="top" />

          <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmitForm} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name={isHotelForm ? 'bed-outline' : 'restaurant-outline'} size={18} color="#fff" />
                <Text style={s.submitTxt}>{isHotelForm ? 'Pošalji zahtjev za sobu' : 'Pošalji rezervaciju stola'}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Time picker modal (restaurant only) */}
        <Modal visible={showTimePicker} transparent animationType="slide">
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
            <View style={[s.timeModal, { paddingBottom: insets.bottom + 20 }]}>
              <View style={s.timeModalHeader}>
                <Text style={s.timeModalTitle}>Odaberi vrijeme</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}><Ionicons name="close" size={22} color={C.text} /></TouchableOpacity>
              </View>
              <FlatList
                data={TIMES} keyExtractor={t => t} numColumns={4}
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

  // ─── CODE SCREEN ──────────────────────────────────────────────────────────
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
          {showCodeInApp ? (
            <View style={s.codeBox}>
              <View style={s.codeIconCircle}><Ionicons name="shield-checkmark" size={40} color={PURPLE} /></View>
              <Text style={s.codeLabel}>Vaš verifikacioni kod</Text>
              <Text style={s.codeValue}>{shownCode}</Text>
              <Text style={s.codeNote}>⚠️ Zapišite ovaj kod! Važi 30 minuta.</Text>
            </View>
          ) : (
            <View style={s.codeBox}>
              <View style={[s.codeIconCircle, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name={sentVia === 'sms' ? 'chatbubble-outline' : 'mail-outline'} size={40} color={GREEN} />
              </View>
              <Text style={[s.codeLabel, { color: GREEN }]}>Kod poslan {sentVia === 'sms' ? 'putem SMS-a' : 'na email'}!</Text>
              <Text style={{ fontSize: 14, color: C.textSec, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
                Provjerite {sentVia === 'sms' ? `SMS poruke na broju ${fPhone}` : `inbox na adresi ${fEmail}`}
              </Text>
            </View>
          )}
          <Text style={s.codeInstruction}>Unesite kod za potvrdu:</Text>
          <TextInput
            style={[s.codeInput, codeError ? { borderColor: C.red } : {}]}
            placeholder="000000" placeholderTextColor={C.textMute}
            value={enteredCode}
            onChangeText={v => { setEnteredCode(v.replace(/\D/g, '').slice(0, 6)); setCodeError(''); }}
            keyboardType="number-pad" maxLength={6} textAlign="center"
          />
          {codeError ? <Text style={s.errorTxt}>{codeError}</Text> : null}
          <TouchableOpacity style={[s.submitBtn, verifying && { opacity: 0.7 }]} onPress={handleVerify} disabled={verifying}>
            {verifying ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.submitTxt}>Potvrdi rezervaciju</Text></>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelLink} onPress={resetToList}>
            <Text style={s.cancelLinkTxt}>Odustani i vrati se na popis</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── SUCCESS SCREEN ───────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <StatusBar barStyle="dark-content" />
        <View style={s.successIcon}><Ionicons name="checkmark-circle" size={72} color={GREEN} /></View>
        <Text style={s.successTitle}>Rezervacija verificirana!</Text>
        <Text style={s.successSub}>
          {isHotelForm ? 'Zahtjev za smještaj je poslan' : 'Rezervacija stola je poslana'} lokaciji
          {selectedLoc ? ` "${selectedLoc.name}"` : ''}.
        </Text>
        <View style={s.successDetails}>
          {isHotelForm ? (
            <>
              <View style={s.successRow}>
                <Ionicons name="calendar-outline" size={16} color={PURPLE} />
                <Text style={s.successRowTxt}>Dolazak: {formatDateShort(fCheckIn)}</Text>
              </View>
              <View style={s.successRow}>
                <Ionicons name="calendar-outline" size={16} color={PURPLE} />
                <Text style={s.successRowTxt}>Odlazak: {formatDateShort(fCheckOut)} ({nights} {nights === 1 ? 'noć' : 'noći'})</Text>
              </View>
              <View style={s.successRow}>
                <Ionicons name="bed-outline" size={16} color={PURPLE} />
                <Text style={s.successRowTxt}>{ROOM_LABELS[fRoomType] || fRoomType} · {BED_LABELS[fBedType] || fBedType}</Text>
              </View>
              <View style={s.successRow}>
                <Ionicons name="people-outline" size={16} color={PURPLE} />
                <Text style={s.successRowTxt}>{fGuests} gosta/a</Text>
              </View>
            </>
          ) : (
            <>
              <View style={s.successRow}>
                <Ionicons name="calendar-outline" size={16} color={PURPLE} />
                <Text style={s.successRowTxt}>{formatDateShort(fDate)} u {fTime}</Text>
              </View>
              <View style={s.successRow}>
                <Ionicons name="people-outline" size={16} color={PURPLE} />
                <Text style={s.successRowTxt}>{fGuests} {fGuests === 1 ? 'osoba' : 'osobe/a'}</Text>
              </View>
              <View style={s.successRow}>
                <Ionicons name="restaurant-outline" size={16} color={PURPLE} />
                <Text style={s.successRowTxt}>{TABLE_PREF_LABELS[fTablePref] || fTablePref}</Text>
              </View>
            </>
          )}
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
  mainTabs: { flexDirection: 'row' },
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
  locCard: { flexDirection: 'row', backgroundColor: C.white, marginHorizontal: 20, marginBottom: 12, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.border, elevation: 2, minHeight: 120 },
  locImgWrap: { width: 110, height: 120 },
  locImg: { width: 110, height: 120 },
  locImgPlaceholder: { width: 110, height: 120, justifyContent: 'center', alignItems: 'center' },
  catBadge: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  catBadgeTxt: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: '#fff' },
  locInfo: { flex: 1, padding: 14 },
  locName: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: C.text },
  locAddr: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: C.textSec },
  reserveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10, alignSelf: 'flex-start' },
  reserveBtnTxt: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: '#fff' },
  subHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  subHeaderTitle: { fontSize: 17, fontFamily: 'Outfit_700Bold', color: C.text },
  subHeaderSub: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: C.textSec },
  label: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: C.text, marginBottom: 8 },
  dateChip: { width: 56, borderRadius: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  dateChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  dateDayName: { fontSize: 10, fontFamily: 'Manrope_600SemiBold', color: C.textSec },
  dateDayNum: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: C.text, marginTop: 2 },
  dateTxtActive: { color: '#fff' },
  nightsBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.purpleLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 },
  nightsTxt: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: PURPLE },
  optPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  optPillActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  optPillTxt: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: C.text },
  optPillTxtActive: { color: '#fff' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  timeModal: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  timeModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  timeModalTitle: { fontSize: 17, fontFamily: 'Outfit_700Bold', color: C.text },
  timeSlot: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  timeSlotActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  timeSlotTxt: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: C.text },
  timeSlotTxtActive: { color: '#fff' },
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
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 26, fontFamily: 'Outfit_700Bold', color: C.text, textAlign: 'center', marginBottom: 10 },
  successSub: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: C.textSec, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  successDetails: { backgroundColor: C.white, borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: C.border },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  successRowTxt: { fontSize: 15, fontFamily: 'Manrope_500Medium', color: C.text },
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
