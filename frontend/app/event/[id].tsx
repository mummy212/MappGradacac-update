import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, StatusBar, Share, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

let WebViewNative: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  try { WebViewNative = require('react-native-webview').WebView; } catch {}
}

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const PURPLE = '#7C3AED';

const MONTH_NAMES = ['januar', 'februar', 'mart', 'april', 'maj', 'juni', 'juli', 'august', 'septembar', 'oktobar', 'novembar', 'decembar'];
const DAY_NAMES = ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub'];

function buildHtml(content: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', sans-serif; font-size: 15px; color: #374151; line-height: 1.7; padding: 0 4px 40px; background: transparent; }
  h2 { font-size: 17px; font-weight: 700; color: #111827; margin: 20px 0 8px; }
  h3 { font-size: 15px; font-weight: 700; color: #374151; margin: 16px 0 6px; }
  p { margin-bottom: 12px; }
  ul, ol { padding-left: 20px; margin-bottom: 12px; }
  li { margin-bottom: 5px; }
  strong { font-weight: 700; color: #111827; }
  em { font-style: italic; }
</style>
</head>
<body>${content}</body>
</html>`;
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [webViewHeight, setWebViewHeight] = useState(200);

  useEffect(() => {
    if (!id) return;
    fetch(`${BACKEND}/api/events/${id}`)
      .then(r => r.json())
      .then(d => { setEvent(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    if (!event) return;
    await Share.share({ message: `${event.title}\n${event.date}${event.time ? ' u ' + event.time : ''}\n${event.location_name || ''}\n\nGradačac Mapa` });
  };

  const formatFullDate = (dt: string) => {
    try {
      const d = new Date(dt);
      return `${DAY_NAMES[d.getDay()]}, ${d.getDate()}. ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}.`;
    } catch { return dt; }
  };

  const isHtml = !!(event?.content_html && event.content_html.trim().startsWith('<'));
  const hasDescription = !!(event?.description && event.description.trim().length > 3);
  const contentHtml = isHtml
    ? buildHtml(event!.content_html)
    : hasDescription
      ? buildHtml(`<p>${(event?.description || '').replace(/\n/g, '</p><p>')}</p>`)
      : null;
  const contentText = isHtml
    ? (event?.content_html || '')
        .replace(/<\/?(p|h[1-6]|li|br|div)[^>]*>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&[^;]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : event?.description || '';

  const isPast = event ? new Date(event.date) < new Date() : false;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Događaj</Text>
        <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadWrap}><ActivityIndicator color={PURPLE} size="large" /></View>
      ) : !event ? (
        <View style={s.loadWrap}>
          <Text style={s.errTxt}>Događaj nije pronađen</Text>
          <TouchableOpacity style={s.backBtnAlt} onPress={() => router.back()}>
            <Text style={s.backBtnAltTxt}>Nazad</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Date banner */}
          <View style={[s.dateBanner, isPast && s.dateBannerPast]}>
            <View style={s.dateBannerInner}>
              <Ionicons name="calendar" size={18} color={isPast ? '#9CA3AF' : '#fff'} />
              <Text style={[s.dateBannerTxt, isPast && { color: '#9CA3AF' }]}>{formatFullDate(event.date)}</Text>
            </View>
            {event.time && (
              <View style={s.dateBannerInner}>
                <Ionicons name="time" size={16} color={isPast ? '#9CA3AF' : 'rgba(255,255,255,0.8)'} />
                <Text style={[s.dateBannerTime, isPast && { color: '#9CA3AF' }]}>{event.time}</Text>
              </View>
            )}
          </View>

          <View style={s.body}>
            {/* Title */}
            <Text style={s.title}>{event.title}</Text>

            {/* Short description */}
            {event.short_description ? (
              <View style={s.leadBlock}>
                <Text style={s.leadTxt}>{event.short_description}</Text>
              </View>
            ) : null}

            {/* Info cards */}
            <View style={s.infoGrid}>
              {event.location_name && (
                <View style={s.infoCard}>
                  <Ionicons name="location" size={16} color={PURPLE} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>Lokacija</Text>
                    <Text style={s.infoVal}>{event.location_name}</Text>
                  </View>
                </View>
              )}
              {event.ticket_price && (
                <View style={s.infoCard}>
                  <Ionicons name="ticket" size={16} color="#059669" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>Ulaz / Karta</Text>
                    <Text style={[s.infoVal, { color: '#059669' }]}>{event.ticket_price}</Text>
                  </View>
                </View>
              )}
              {event.organizer && (
                <View style={s.infoCard}>
                  <Ionicons name="people" size={16} color="#3B82F6" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>Organizator</Text>
                    <Text style={s.infoVal}>{event.organizer}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Divider before content */}
            {contentHtml && <View style={s.divider} />}

            {/* Rich content */}
            {contentHtml && (WebViewNative ? (
              <WebViewNative
                style={{ height: webViewHeight, backgroundColor: 'transparent' }}
                source={{ html: contentHtml }}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                injectedJavaScript={`
                  window.ReactNativeWebView.postMessage(
                    document.body.scrollHeight.toString()
                  );
                  true;
                `}
                onMessage={(e: any) => {
                  const h = parseInt(e.nativeEvent.data, 10);
                  if (!isNaN(h) && h > 0) setWebViewHeight(h + 24);
                }}
              />
            ) : (
              <Text style={{ fontSize: 15, color: '#374151', lineHeight: 24, marginTop: 8 }}>{contentText}</Text>
            ))}

            {/* Ticket URL */}
            {event.ticket_url && (
              <TouchableOpacity style={s.ticketBtn} onPress={() => Linking.openURL(event.ticket_url)}>
                <Ionicons name="ticket-outline" size={18} color="#fff" />
                <Text style={s.ticketBtnTxt}>Kupi kartu</Text>
              </TouchableOpacity>
            )}

            {/* Website */}
            {event.website && (
              <TouchableOpacity style={s.webBtn} onPress={() => Linking.openURL(event.website)}>
                <Ionicons name="globe-outline" size={16} color={PURPLE} />
                <Text style={s.webBtnTxt}>{event.website.replace(/^https?:\/\//, '')}</Text>
              </TouchableOpacity>
            )}

            {isPast && (
              <View style={s.pastNote}>
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text style={s.pastNoteTxt}>Ovaj događaj se već održao</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, marginHorizontal: 12, fontSize: 16, fontWeight: '600', color: '#111827' },
  shareBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errTxt: { fontSize: 16, color: '#6B7280', marginBottom: 16 },
  backBtnAlt: { backgroundColor: PURPLE, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnAltTxt: { color: '#fff', fontWeight: '600' },
  dateBanner: { backgroundColor: PURPLE, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  dateBannerPast: { backgroundColor: '#F3F4F6' },
  dateBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateBannerTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
  dateBannerTime: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  body: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', lineHeight: 30, marginBottom: 14 },
  leadBlock: { backgroundColor: '#F0EFFE', borderLeftWidth: 3, borderLeftColor: PURPLE, borderRadius: 4, padding: 12, marginBottom: 16 },
  leadTxt: { fontSize: 14, color: '#4C3D9E', lineHeight: 22, fontStyle: 'italic' },
  infoGrid: { gap: 10, marginBottom: 8 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  infoLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoVal: { fontSize: 14, color: '#111827', fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  ticketBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  ticketBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  webBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 12, backgroundColor: '#F0EFFE', borderRadius: 12 },
  webBtnTxt: { color: PURPLE, fontSize: 13, fontWeight: '600' },
  pastNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12 },
  pastNoteTxt: { fontSize: 13, color: '#9CA3AF' },
});
