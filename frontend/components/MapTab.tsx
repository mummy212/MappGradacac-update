import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Platform, ActivityIndicator, Modal, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import LeafletMap, { LeafletMapRef } from './LeafletMap';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const LAT = 44.8797, LNG = 18.4275;
const PURPLE = '#7C3AED';
const GREEN = '#10B981';

interface Cat { id: string; name: string; icon: string; color: string; }
interface Loc {
  id: string; name: string; category: string; latitude: number;
  longitude: number; address: string; is_open?: boolean;
}

type DlStatus = 'idle' | 'downloading' | 'complete' | 'cancelled';

export default function MapTab({
  userLoc, filterCategory, onCategoryChange,
}: {
  userLoc: { latitude: number; longitude: number } | null;
  filterCategory: string;
  onCategoryChange: (cat: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<LeafletMapRef>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [locs, setLocs] = useState<Loc[]>([]);
  const [selectedCat, setSelectedCat] = useState(filterCategory);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Download state
  const [dlStatus, setDlStatus] = useState<DlStatus>('idle');
  const [dlDone, setDlDone] = useState(0);
  const [dlTotal, setDlTotal] = useState(0);
  const [showDlModal, setShowDlModal] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { setSelectedCat(filterCategory); }, [filterCategory]);

  const fetchData = useCallback(async () => {
    try {
      const [cl, ll] = await Promise.all([
        fetch(`${BACKEND}/api/categories`).then(r => r.json()),
        fetch(`${BACKEND}/api/locations`).then(r => r.json()),
      ]);
      setCats(Array.isArray(cl) ? cl : []);
      setLocs(Array.isArray(ll) ? ll : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Update progress bar animation
  useEffect(() => {
    if (dlTotal > 0) {
      Animated.timing(progressAnim, {
        toValue: dlDone / dlTotal,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [dlDone, dlTotal]);

  const handleWebMessage = useCallback((data: any) => {
    if (data.type === 'download_progress') {
      setDlDone(data.downloaded || 0);
      setDlTotal(data.total || 0);
      setDlStatus('downloading');
    } else if (data.type === 'download_complete') {
      setDlDone(data.count || 0);
      setDlStatus('complete');
    } else if (data.type === 'download_cancelled') {
      setDlStatus('cancelled');
    }
  }, []);

  const startDownload = () => {
    setDlDone(0);
    setDlTotal(0);
    setDlStatus('downloading');
    setShowDlModal(true);
    progressAnim.setValue(0);
    mapRef.current?.startDownload();
  };

  const cancelDownload = () => {
    mapRef.current?.cancelDownload();
    setDlStatus('cancelled');
  };

  const handleCatSelect = (catId: string) => {
    const next = selectedCat === catId ? '' : catId;
    setSelectedCat(next);
    onCategoryChange(next);
  };

  const filteredLocs = locs.filter(l => {
    if (selectedCat && l.category !== selectedCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q);
    }
    return true;
  });

  const markerColors = Object.fromEntries(cats.map(c => [c.id, c.color]));
  const dlPercent = dlTotal > 0 ? Math.round((dlDone / dlTotal) * 100) : 0;

  return (
    <View style={ms.root}>
      {loading && (
        <View style={ms.loader}>
          <ActivityIndicator color={PURPLE} size="large" />
        </View>
      )}

      <LeafletMap
        ref={mapRef}
        locations={filteredLocs}
        markerColors={markerColors}
        centerLat={LAT}
        centerLng={LNG}
        userLatitude={userLoc?.latitude}
        userLongitude={userLoc?.longitude}
        onMarkerPress={(id) => router.push(`/location/${id}`)}
        onWebMessage={handleWebMessage}
      />

      {/* Top overlay: search + category pills + download */}
      <View style={[ms.topOverlay, { top: insets.top + 8 }]}>
        <View style={ms.searchRow}>
          <View style={ms.searchBar}>
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              style={ms.searchInput}
              placeholder="Pretraži lokacije..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          {/* Offline Download Button */}
          <TouchableOpacity
            style={[ms.dlTopBtn, dlStatus === 'complete' && { backgroundColor: GREEN }]}
            onPress={() => {
              if (dlStatus === 'downloading') setShowDlModal(true);
              else startDownload();
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={dlStatus === 'complete' ? 'checkmark' : dlStatus === 'downloading' ? 'hourglass-outline' : 'cloud-download-outline'}
              size={18}
              color={dlStatus === 'complete' ? '#fff' : '#374151'}
            />
          </TouchableOpacity>
        </View>

        {cats.length > 0 && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={ms.pillsRow} style={ms.pillsScroll}
          >
            <TouchableOpacity
              style={[ms.pill, !selectedCat && ms.pillActive]}
              onPress={() => handleCatSelect('')}
            >
              <Text style={[ms.pillTxt, !selectedCat && ms.pillTxtActive]}>Sve</Text>
            </TouchableOpacity>
            {cats.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[ms.pill, selectedCat === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => handleCatSelect(cat.id)}
              >
                <Ionicons
                  name={((cat.icon || 'location') + '-outline') as any}
                  size={13} color={selectedCat === cat.id ? '#fff' : '#6B7280'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[ms.pillTxt, selectedCat === cat.id && ms.pillTxtActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Floating controls: Locate + QR */}
      <View style={[ms.controls, { bottom: 24 }]}>
        <TouchableOpacity
          style={ms.ctrlBtn}
          onPress={() => { if (userLoc) mapRef.current?.flyTo(userLoc.latitude, userLoc.longitude, 16); }}
        >
          <Ionicons name="locate" size={22} color={PURPLE} />
        </TouchableOpacity>
        <TouchableOpacity style={[ms.ctrlBtn, { backgroundColor: PURPLE }]} onPress={() => router.push('/qr')}>
          <Ionicons name="qr-code-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Location count pill */}
      {!loading && (
        <View style={[ms.countPill, { bottom: 24, left: 14 }]}>
          <Text style={ms.countTxt}>{filteredLocs.length} lokacija</Text>
        </View>
      )}

      {/* Download Progress Modal */}
      <Modal visible={showDlModal} transparent animationType="slide">
        <View style={ms.modalOverlay}>
          <View style={ms.modalCard}>
            {/* Icon */}
            <View style={[ms.dlIcon, dlStatus === 'complete' && { backgroundColor: GREEN + '20' }]}>
              {dlStatus === 'complete'
                ? <Ionicons name="checkmark-circle" size={40} color={GREEN} />
                : dlStatus === 'cancelled'
                ? <Ionicons name="close-circle" size={40} color="#EF4444" />
                : <Ionicons name="cloud-download-outline" size={40} color={PURPLE} />
              }
            </View>

            {/* Title */}
            <Text style={ms.dlTitle}>
              {dlStatus === 'complete' ? 'Preuzimanje završeno!' :
               dlStatus === 'cancelled' ? 'Preuzimanje otkazano' :
               'Preuzimanje offline mape'}
            </Text>

            {/* Subtitle */}
            <Text style={ms.dlSub}>
              {dlStatus === 'complete'
                ? `${dlDone} tile-ova sačuvano. Mapa radi offline!`
                : dlStatus === 'cancelled'
                ? `Preuzeto ${dlDone} od ${dlTotal} tile-ova`
                : dlTotal > 0
                ? `Preuzimanje tile-ova za Gradačac (zoom 13–16)\nNemoj zatvarati aplikaciju`
                : 'Izračunavanje potrebnih tile-ova...'}
            </Text>

            {/* Progress */}
            {(dlStatus === 'downloading' || dlStatus === 'cancelled') && dlTotal > 0 && (
              <View style={ms.progressWrap}>
                <View style={ms.progressRow}>
                  <Text style={ms.progressCount}>{dlDone} / {dlTotal}</Text>
                  <Text style={ms.progressPct}>{dlPercent}%</Text>
                </View>
                <View style={ms.progressBg}>
                  <Animated.View style={[ms.progressFill, {
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                  }]} />
                </View>
              </View>
            )}

            {/* Complete stats */}
            {dlStatus === 'complete' && (
              <View style={ms.statsRow}>
                <View style={ms.statItem}>
                  <Ionicons name="layers-outline" size={18} color={PURPLE} />
                  <Text style={ms.statVal}>{dlDone}</Text>
                  <Text style={ms.statLbl}>Tile-ova</Text>
                </View>
                <View style={ms.statItem}>
                  <Ionicons name="wifi-outline" size={18} color={GREEN} />
                  <Text style={ms.statVal}>Offline</Text>
                  <Text style={ms.statLbl}>Dostupno</Text>
                </View>
                <View style={ms.statItem}>
                  <Ionicons name="time-outline" size={18} color="#F59E0B" />
                  <Text style={ms.statVal}>7 dana</Text>
                  <Text style={ms.statLbl}>Cache trajanje</Text>
                </View>
              </View>
            )}

            {/* Buttons */}
            <View style={ms.dlBtns}>
              {dlStatus === 'downloading' && (
                <TouchableOpacity style={ms.cancelBtn} onPress={cancelDownload}>
                  <Text style={ms.cancelBtnTxt}>Otkaži</Text>
                </TouchableOpacity>
              )}
              {(dlStatus === 'complete' || dlStatus === 'cancelled' || dlStatus === 'idle') && (
                <TouchableOpacity style={ms.closeBtn} onPress={() => setShowDlModal(false)}>
                  <Text style={ms.closeBtnTxt}>Zatvori</Text>
                </TouchableOpacity>
              )}
              {dlStatus === 'cancelled' && (
                <TouchableOpacity style={ms.retryBtn} onPress={startDownload}>
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={ms.retryBtnTxt}>Pokušaj ponovo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ms = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 99,
  },
  topOverlay: { position: 'absolute', left: 12, right: 12, zIndex: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBar: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 8,
    ...Platform.select({
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.12)' } as any,
      default: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    }),
  },
  dlTopBtn: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.12)' } as any,
      default: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    }),
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Manrope_500Medium', color: '#111827', padding: 0 },
  pillsScroll: { marginTop: 8 },
  pillsRow: { paddingHorizontal: 2, gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } as any, default: { elevation: 2 } }),
  },
  pillActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  pillTxt: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: '#6B7280' },
  pillTxtActive: { color: '#fff' },
  controls: { position: 'absolute', right: 14, gap: 10, zIndex: 20 },
  ctrlBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } as any, default: { elevation: 4 } }),
  },
  countPill: {
    position: 'absolute', backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  countTxt: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: '#6B7280' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40, alignItems: 'center',
  },
  dlIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: PURPLE + '15', justifyContent: 'center', alignItems: 'center',
    marginBottom: 18,
  },
  dlTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
  dlSub: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  progressWrap: { width: '100%', marginBottom: 24 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressCount: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: '#374151' },
  progressPct: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: PURPLE },
  progressBg: { height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: 10, backgroundColor: PURPLE, borderRadius: 5 },
  statsRow: { flexDirection: 'row', gap: 24, marginBottom: 24 },
  statItem: { alignItems: 'center', gap: 4 },
  statVal: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#111827' },
  statLbl: { fontSize: 11, fontFamily: 'Manrope_400Regular', color: '#9CA3AF' },
  dlBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  cancelBtnTxt: { fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: '#374151' },
  closeBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  closeBtnTxt: { fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: '#374151' },
  retryBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 14,
    backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  retryBtnTxt: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: '#fff' },
});
