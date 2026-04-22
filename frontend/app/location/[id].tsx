import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  ActivityIndicator, Dimensions, Platform, Alert, Modal, TextInput,
  StatusBar, KeyboardAvoidingView, Linking, FlatList, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts, Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium } from '@expo-google-fonts/outfit';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAV_KEY = 'gradacac_favorites';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const colors = {
  background: '#FAF9F6', surface: '#FFFFFF', primary: '#4A5D4E', primaryFg: '#FFFFFF',
  accent: '#D97757', accentFg: '#FFFFFF', textPrimary: '#1C1C1C', textSecondary: '#6B6B6B',
  border: '#E5E4E2', star: '#F59E0B', danger: '#E74C3C',
};

const PRICE_LABELS = ['', '€', '€€', '€€€'];

// Mapa oznaka po kategoriji (meni / ponuda / usluge)
const OFFERING_MAP: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; emptyMsg: string }> = {
  restaurant:   { label: 'Meni',    icon: 'restaurant-outline', emptyMsg: 'Meni još nije dodan' },
  cafe:         { label: 'Meni',    icon: 'cafe-outline',       emptyMsg: 'Meni još nije dodan' },
  market:       { label: 'Ponuda',  icon: 'pricetags-outline',  emptyMsg: 'Ponuda još nije dodana' },
  pharmacy:     { label: 'Ponuda',  icon: 'medkit-outline',     emptyMsg: 'Ponuda još nije dodana' },
  auto_service: { label: 'Usluge',  icon: 'construct-outline',  emptyMsg: 'Usluge još nisu dodane' },
  gas_station:  { label: 'Usluge',  icon: 'car-outline',        emptyMsg: 'Usluge još nisu dodane' },
  parking:      { label: 'Info',    icon: 'car-sport-outline',  emptyMsg: 'Info nije dodan' },
  prenociste:   { label: 'Sadrzaj', icon: 'bed-outline',        emptyMsg: 'Sadrzaj nije dodan' },
};
const getOffering = (cat?: string) => OFFERING_MAP[cat || ''] || { label: 'Ponuda', icon: 'pricetags-outline' as any, emptyMsg: 'Ponuda još nije dodana' };

interface LocationDetail {
  id: string; name: string; category: string; address: string;
  latitude: number; longitude: number; phone?: string;
  description?: string; working_hours?: string; is_premium?: boolean;
  images: string[]; service_tags: string[]; price_level: number;
  avg_rating: number; review_count: number;
  total_spots?: number; is_free_parking?: boolean;
}

interface ReviewItem {
  id: string; location_id: string; author_name: string;
  stars: number; comment?: string; created_at: string;
}

function StarRating({ rating, size = 18, interactive = false, onRate }: { rating: number; size?: number; interactive?: boolean; onRate?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity key={i} disabled={!interactive}
          onPress={() => onRate && onRate(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Ionicons name={i <= rating ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline'}
            size={size} color={colors.star} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newName, setNewName] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  // Chat
  const [messages, setMessages] = useState<any[]>([]);
  const [chatName, setChatName] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  // Menu
  const [menuItems, setMenuItems] = useState<any[]>([]);
  // Offers
  const [offers, setOffers] = useState<any[]>([]);
  // Active tab
  const [activeSection, setActiveSection] = useState<'info'|'menu'|'chat'>('info');
  const [refreshing, setRefreshing] = useState(false);
  // Favorites
  const [isFav, setIsFav] = useState(false);

  const [fontsLoaded] = useFonts({
    Outfit_700Bold, Outfit_600SemiBold, Outfit_500Medium,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
  });

  useEffect(() => { if (id) { fetchData(); loadFavState(); } }, [id]);

  const loadFavState = async () => {
    try {
      const raw = await AsyncStorage.getItem(FAV_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setIsFav(ids.includes(id as string));
    } catch {}
  };

  const toggleFav = async () => {
    try {
      const raw = await AsyncStorage.getItem(FAV_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      const next = isFav ? ids.filter(x => x !== id) : [...ids, id as string];
      await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
      setIsFav(!isFav);
    } catch {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locRes, revRes, msgRes, menuRes, offRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/locations/${id}`),
        axios.get(`${BACKEND_URL}/api/locations/${id}/reviews`),
        axios.get(`${BACKEND_URL}/api/locations/${id}/messages`).catch(() => ({ data: [] })),
        axios.get(`${BACKEND_URL}/api/locations/${id}/menu`).catch(() => ({ data: [] })),
        axios.get(`${BACKEND_URL}/api/locations/${id}/offers`).catch(() => ({ data: [] })),
      ]);
      setLocation(locRes.data);
      setReviews(revRes.data);
      setMessages(msgRes.data);
      setMenuItems(menuRes.data);
      setOffers(offRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const submitReview = async () => {
    if (!newName.trim()) { Alert.alert('Greška', 'Unesite vaše ime'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${BACKEND_URL}/api/locations/${id}/reviews`, {
        author_name: newName.trim(), stars: newRating, comment: newComment.trim() || null,
      });
      setReviewModalVisible(false);
      setNewName(''); setNewComment(''); setNewRating(5);
      fetchData();
    } catch (e) { Alert.alert('Greška', 'Nije moguće ostaviti recenziju'); }
    setSubmitting(false);
  };

  const openNav = () => {
    if (!location) return;
    axios.post(`${BACKEND_URL}/api/locations/${id}/track/nav_clicks`).catch(() => {});
    const url = Platform.select({
      ios: `maps:0,0?q=${location.latitude},${location.longitude}`,
      android: `geo:0,0?q=${location.latitude},${location.longitude}(${location.name})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  const callPhone = () => {
    if (location?.phone) {
      axios.post(`${BACKEND_URL}/api/locations/${id}/track/call_clicks`).catch(() => {});
      Linking.openURL(`tel:${location.phone}`);
    }
  };

  const sendChat = async () => {
    if (!chatName.trim() || !chatMsg.trim()) { Alert.alert('Greška', 'Ime i poruka su obavezni'); return; }
    setSendingChat(true);
    try {
      await axios.post(`${BACKEND_URL}/api/locations/${id}/messages`, { sender_name: chatName.trim(), message: chatMsg.trim() });
      setChatMsg('');
      const r = await axios.get(`${BACKEND_URL}/api/locations/${id}/messages`);
      setMessages(r.data);
    } catch { Alert.alert('Greška', 'Poruka nije poslana'); }
    setSendingChat(false);
  };

  if (loading || !fontsLoaded || !location) {
    return (
      <View testID="detail-loading" style={s.loadWrap}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View testID="location-detail-screen" style={s.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }}
            tintColor={colors.primary}
            colors={[colors.primary, colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* Hero Image / Header */}
        <View style={s.hero}>
          {location.images && location.images.length > 0 ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => { setSelectedImageIndex(0); setImageViewerVisible(true); }}>
              <Image source={{ uri: location.images[0] }} style={s.heroImage} />
            </TouchableOpacity>
          ) : (
            <View style={s.heroPlaceholder}>
              <Ionicons name="image-outline" size={48} color={colors.border} />
              <Text style={s.heroPlaceholderText}>Nema slika</Text>
            </View>
          )}
          <View style={[s.heroOverlay, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity testID="back-detail-btn" style={s.backCircle} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity testID="fav-btn" style={s.backCircle} onPress={toggleFav}>
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? '#EF4444' : '#fff'} />
            </TouchableOpacity>
          </View>
          {location.images && location.images.length > 1 && (
            <View style={s.imageCount}>
              <Ionicons name="images" size={14} color="#fff" />
              <Text style={s.imageCountText}>{location.images.length}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={s.content}>
          {/* Name & Rating */}
          <Text testID="detail-name" style={s.name}>{location.name}</Text>
          <View style={s.ratingRow}>
            <StarRating rating={location.avg_rating} size={20} />
            <Text style={s.ratingText}>{location.avg_rating > 0 ? location.avg_rating.toFixed(1) : '—'}</Text>
            <Text style={s.reviewCount}>({location.review_count} {location.review_count === 1 ? 'recenzija' : 'recenzija'})</Text>
            {location.price_level > 0 && (
              <View style={s.priceBadge}>
                <Text style={s.priceText}>{PRICE_LABELS[location.price_level]}</Text>
              </View>
            )}
          </View>

          {/* Service Tags */}
          {location.service_tags && location.service_tags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tagsRow}>
              {location.service_tags.map((tag, i) => (
                <View key={i} style={s.tag}><Text style={s.tagText}>{tag}</Text></View>
              ))}
            </ScrollView>
          )}

          {/* Info Section */}
          <View style={s.infoSection}>
            <InfoRow icon="location-outline" text={location.address} />
            {location.working_hours && <InfoRow icon="time-outline" text={location.working_hours} />}
            {location.phone && <InfoRow icon="call-outline" text={location.phone} />}
          </View>

          {/* Parking Info */}
          {location.category === 'parking' && (
            <View style={[s.infoSection, { marginTop: 0 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {location.total_spots != null && (
                  <View style={s.parkInfoBadge}>
                    <Ionicons name="car-outline" size={15} color={colors.primary} />
                    <Text style={s.parkInfoTxt}>{location.total_spots} mjesta</Text>
                  </View>
                )}
                <View style={[s.parkInfoBadge, { backgroundColor: location.is_free_parking ? '#27AE6015' : '#E74C3C15' }]}>
                  <Ionicons name={location.is_free_parking ? 'checkmark-circle-outline' : 'card-outline'} size={15}
                    color={location.is_free_parking ? '#27AE60' : '#E74C3C'} />
                  <Text style={[s.parkInfoTxt, { color: location.is_free_parking ? '#27AE60' : '#E74C3C' }]}>
                    {location.is_free_parking ? 'Besplatan parking' : 'Parking se placa'}
                  </Text>
                </View>
              </View>
            </View>
          )}


          {/* Description */}
          {location.description && (
            <View style={s.descSection}>
              <Text style={s.sectionTitle}>O lokaciji</Text>
              <Text style={s.descText}>{location.description}</Text>
            </View>
          )}

          {/* Image Gallery */}
          {location.images && location.images.length > 1 && (
            <View style={s.gallerySection}>
              <Text style={s.sectionTitle}>Galerija</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {location.images.map((img, i) => (
                  <TouchableOpacity key={i} onPress={() => { setSelectedImageIndex(i); setImageViewerVisible(true); }}>
                    <Image source={{ uri: img }} style={s.galleryImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity testID="nav-detail-btn" style={s.btnPrimary} onPress={openNav} activeOpacity={0.7}>
              <Ionicons name="navigate" size={20} color={colors.accentFg} />
              <Text style={s.btnPrimaryText}>Navigacija</Text>
            </TouchableOpacity>
            {location.phone && (
              <TouchableOpacity testID="call-detail-btn" style={s.btnSecondary} onPress={callPhone} activeOpacity={0.7}>
                <Ionicons name="call" size={20} color={colors.textPrimary} />
                <Text style={s.btnSecondaryText}>Pozovi</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Active Offers */}
          {offers.length > 0 && (
            <View style={s.reviewsSection}>
              <Text style={s.sectionTitle}>Aktivne ponude</Text>
              {offers.map((o: any) => (
                <View key={o.id} style={{ backgroundColor: colors.accent+'0C', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.accent+'20' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: colors.textPrimary, flex: 1 }}>{o.title}</Text>
                    {o.discount_percent && <Text style={{ fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.accent }}>-{o.discount_percent}%</Text>}
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, marginTop: 4 }}>{o.description}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Section Tabs: Info / Meni (ili Ponuda/Usluge) / Chat */}
          <View style={{ flexDirection: 'row', marginTop: 16, marginBottom: 12, backgroundColor: colors.background, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            {(['info', 'menu', 'chat'] as const).map(tab => (
              <TouchableOpacity key={tab} testID={`section-${tab}`} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: activeSection === tab ? colors.primary : 'transparent' }}
                onPress={() => setActiveSection(tab)}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: activeSection === tab ? '#fff' : colors.textSecondary }}>
                  {tab === 'info' ? 'Recenzije' : tab === 'menu' ? getOffering(location?.category).label : 'Chat'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Menu / Ponuda / Usluge Section */}
          {activeSection === 'menu' && (
            <View>
              {menuItems.length === 0 ? (
                <View style={s.noReviews}>
                  <Ionicons name={getOffering(location?.category).icon} size={36} color={colors.border} />
                  <Text style={s.noReviewsText}>{getOffering(location?.category).emptyMsg}</Text>
                </View>
              ) : (
                menuItems.map((item: any) => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: colors.background, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
                    {item.image && <Image source={{ uri: item.image }} style={{ width: 50, height: 50, borderRadius: 10, marginRight: 12 }} />}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: colors.textPrimary }}>{item.name}</Text>
                      {item.description && <Text style={{ fontSize: 12, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, marginTop: 2 }}>{item.description}</Text>}
                      <Text style={{ fontSize: 11, fontFamily: 'Manrope_500Medium', color: colors.accent, marginTop: 2 }}>{item.category}</Text>
                    </View>
                    <Text style={{ fontSize: 16, fontFamily: 'Outfit_700Bold', color: colors.primary }}>{item.price.toFixed(2)} KM</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Chat Section */}
          {activeSection === 'chat' && (
            <View>
              <View style={{ backgroundColor: colors.background, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
                <TextInput testID="chat-name" style={{ backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}
                  value={chatName} onChangeText={setChatName} placeholder="Vaše ime" placeholderTextColor={colors.textSecondary} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput testID="chat-message" style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, borderWidth: 1, borderColor: colors.border }}
                    value={chatMsg} onChangeText={setChatMsg} placeholder="Pošaljite poruku..." placeholderTextColor={colors.textSecondary} />
                  <TouchableOpacity testID="send-chat-btn" style={{ marginLeft: 8, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}
                    onPress={sendChat} disabled={sendingChat}>
                    {sendingChat ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
                  </TouchableOpacity>
                </View>
              </View>
              {messages.length === 0 ? (
                <View style={s.noReviews}>
                  <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.border} />
                  <Text style={s.noReviewsText}>Nema poruka</Text>
                  <Text style={s.noReviewsSub}>Postavite pitanje ovom biznisu!</Text>
                </View>
              ) : (
                messages.map((msg: any) => (
                  <View key={msg.id} style={{ backgroundColor: colors.background, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Outfit_700Bold' }}>{msg.sender_name?.charAt(0)?.toUpperCase()}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: colors.textPrimary, marginLeft: 8, flex: 1 }}>{msg.sender_name}</Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Manrope_400Regular', color: colors.textSecondary }}>{new Date(msg.created_at).toLocaleDateString('bs-BA')}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontFamily: 'Manrope_400Regular', color: colors.textPrimary, lineHeight: 20 }}>{msg.message}</Text>
                    {msg.reply && (
                      <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: colors.accent, marginBottom: 2 }}>Odgovor:</Text>
                        <Text style={{ fontSize: 13, fontFamily: 'Manrope_400Regular', color: colors.textPrimary }}>{msg.reply}</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* Reviews Section (only when info tab active) */}
          {activeSection === 'info' && (
            <View style={s.reviewsSection}>
              <View style={s.reviewsHead}>
                <Text style={s.sectionTitle}>Recenzije</Text>
                <TouchableOpacity testID="add-review-btn" style={s.addReviewBtn}
                  onPress={() => setReviewModalVisible(true)} activeOpacity={0.7}>
                  <Ionicons name="create-outline" size={18} color={colors.accent} />
                  <Text style={s.addReviewText}>Ostavi ocjenu</Text>
                </TouchableOpacity>
              </View>

            {reviews.length === 0 ? (
              <View style={s.noReviews}>
                <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.border} />
                <Text style={s.noReviewsText}>Još nema recenzija</Text>
                <Text style={s.noReviewsSub}>Budite prvi koji će ostaviti ocjenu!</Text>
              </View>
            ) : (
              reviews.map(review => (
                <View key={review.id} testID={`review-${review.id}`} style={s.reviewCard}>
                  <View style={s.reviewHeader}>
                    <View style={s.reviewAvatar}>
                      <Text style={s.reviewAvatarText}>{review.author_name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={s.reviewMeta}>
                      <Text style={s.reviewName}>{review.author_name}</Text>
                      <Text style={s.reviewDate}>{new Date(review.created_at).toLocaleDateString('bs-BA')}</Text>
                    </View>
                    <StarRating rating={review.stars} size={14} />
                  </View>
                  {review.comment && <Text style={s.reviewComment}>{review.comment}</Text>}
                </View>
              ))
            )}
            </View>
          )}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={reviewModalVisible} animationType="slide" transparent onRequestClose={() => setReviewModalVisible(false)}>
        <View style={s.modalOuter}>
          <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setReviewModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end' }}>
            <View testID="review-modal" style={s.modalBox}>
              <View style={s.modalDrag} />
              <Text style={s.modalTitle}>Ostavite recenziju</Text>

              <Text style={s.fieldLabel}>Vaša ocjena</Text>
              <View style={s.starPicker}>
                <StarRating rating={newRating} size={36} interactive onRate={setNewRating} />
              </View>

              <Text style={s.fieldLabel}>Vaše ime *</Text>
              <TextInput testID="review-name-input" style={s.fieldInput} value={newName}
                onChangeText={setNewName} placeholder="Unesite ime" placeholderTextColor={colors.textSecondary} />

              <Text style={s.fieldLabel}>Komentar (opciono)</Text>
              <TextInput testID="review-comment-input" style={[s.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                value={newComment} onChangeText={setNewComment} placeholder="Opišite vaše iskustvo..."
                placeholderTextColor={colors.textSecondary} multiline />

              <TouchableOpacity testID="submit-review-btn" style={s.submitBtn} onPress={submitReview} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="send" size={18} color="#fff" /><Text style={s.submitBtnText}>Pošalji recenziju</Text></>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal visible={imageViewerVisible} animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
        <View style={s.imageViewer}>
          <TouchableOpacity style={[s.closeViewer, { top: insets.top + 10 }]} onPress={() => setImageViewerVisible(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {location.images && location.images.length > 0 && (
            <FlatList
              data={location.images}
              horizontal
              pagingEnabled
              initialScrollIndex={selectedImageIndex}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={{ width, height: height * 0.7 }} resizeMode="contain" />
              )}
              keyExtractor={(_, i) => String(i)}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={s.infoText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  // Hero
  hero: { height: 260, backgroundColor: colors.border, position: 'relative' },
  heroImage: { width: '100%', height: 260 },
  heroPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0EFED' },
  heroPlaceholderText: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: colors.textSecondary, marginTop: 8 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  imageCount: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  imageCountText: { color: '#fff', fontSize: 13, fontFamily: 'Manrope_700Bold', marginLeft: 4 },
  // Content
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, backgroundColor: colors.surface, paddingHorizontal: 24, paddingTop: 24 },
  name: { fontSize: 26, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, letterSpacing: -0.8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  ratingText: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: colors.textPrimary, marginLeft: 8 },
  reviewCount: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, marginLeft: 4 },
  priceBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 10 },
  priceText: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: '#2E7D32' },
  // Tags
  tagsRow: { marginTop: 14, marginBottom: 4 },
  tag: { backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  tagText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: colors.primary },
  // Info
  infoSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  infoText: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: colors.textPrimary, marginLeft: 14, flex: 1, lineHeight: 22 },
  // Description
  descSection: { marginTop: 8 },
  parkInfoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#4A5D4E10', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  parkInfoTxt: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: colors.primary },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, marginBottom: 12 },
  descText: { fontSize: 15, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, lineHeight: 24 },
  // Gallery
  gallerySection: { marginTop: 24 },
  galleryImage: { width: 140, height: 100, borderRadius: 12, marginRight: 10, backgroundColor: colors.border },
  // Actions
  actions: { flexDirection: 'row', gap: 12, marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16 },
  btnPrimaryText: { color: colors.accentFg, fontSize: 15, fontFamily: 'Manrope_700Bold', marginLeft: 8 },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: colors.border },
  btnSecondaryText: { color: colors.textPrimary, fontSize: 15, fontFamily: 'Manrope_700Bold', marginLeft: 8 },
  // Reviews
  reviewsSection: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
  reviewsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addReviewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  addReviewText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: colors.accent, marginLeft: 6 },
  noReviews: { alignItems: 'center', paddingVertical: 32 },
  noReviewsText: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: colors.textSecondary, marginTop: 8 },
  noReviewsSub: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: colors.border, marginTop: 4 },
  reviewCard: { backgroundColor: colors.background, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center' },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_700Bold' },
  reviewMeta: { flex: 1, marginLeft: 12 },
  reviewName: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: colors.textPrimary },
  reviewDate: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: colors.textSecondary, marginTop: 2 },
  reviewComment: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: colors.textPrimary, marginTop: 10, lineHeight: 20 },
  // Modals
  modalOuter: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalBox: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalDrag: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  fieldInput: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: 'Manrope_500Medium', color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  starPicker: { alignItems: 'center', paddingVertical: 12 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, marginTop: 20 },
  submitBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold', marginLeft: 8 },
  // Image viewer
  imageViewer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  closeViewer: { position: 'absolute', right: 16, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
});
