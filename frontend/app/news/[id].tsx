import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, StatusBar, Share, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const PURPLE = '#7C3AED';

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  'Vijesti': { bg: '#DBEAFE', text: '#1D4ED8' },
  'Obavještenje': { bg: '#FEF3C7', text: '#D97706' },
  'Kultura': { bg: '#EDE9FE', text: '#7C3AED' },
  'Sport': { bg: '#FEE2E2', text: '#DC2626' },
  'Turizam': { bg: '#D1FAE5', text: '#059669' },
  'Ostalo': { bg: '#F3F4F6', text: '#6B7280' },
};

const MONTHS_LONG = ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'augusta', 'septembra', 'oktobra', 'novembra', 'decembra'];

const stripHtml = (html: string) =>
  html
    .replace(/<\/?(p|h[1-6]|li|br|div)[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();

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
  a { color: ${PURPLE}; }
</style>
</head>
<body>${content}</body>
</html>`;
}

// Lazy-load WebView samo na native
let WebViewComponent: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  try { WebViewComponent = require('react-native-webview').WebView; } catch {}
}

function ContentRenderer({ content, isHtml }: { content: string; isHtml: boolean }) {
  const [height, setHeight] = useState(300);
  const html = isHtml ? buildHtml(content) : buildHtml(`<p>${content.replace(/\n/g, '</p><p>')}</p>`);

  if (Platform.OS === 'web' || !WebViewComponent) {
    // Web: prikaži čist tekst (HTML stripped)
    const WV = WebViewComponent;
    if (!WV) {
      return (
        <Text style={{ fontSize: 15, color: '#374151', lineHeight: 24, marginTop: 8 }}>
          {isHtml ? stripHtml(content) : content}
        </Text>
      );
    }
  }

  const WV = WebViewComponent!;
  return (
    <WV
      style={{ height, backgroundColor: 'transparent' }}
      source={{ html }}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      injectedJavaScript={`window.ReactNativeWebView.postMessage(document.body.scrollHeight.toString()); true;`}
      onMessage={(e: any) => {
        const h = parseInt(e.nativeEvent.data, 10);
        if (!isNaN(h) && h > 0) setHeight(h + 24);
      }}
    />
  );
}

export default function NewsDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    fetch(`${BACKEND}/api/news/${id}`)
      .then(r => r.json())
      .then(d => { setItem(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    if (!item) return;
    await Share.share({ message: `${item.title}\n\nGradačac Mapa` });
  };

  const formatDate = (dt: string) => {
    try {
      const d = new Date(dt);
      return `${d.getDate()}. ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}.`;
    } catch { return dt; }
  };

  const catStyle = item ? (CAT_COLORS[item.category] || CAT_COLORS['Ostalo']) : CAT_COLORS['Vijesti'];
  const isHtml = !!(item?.content?.trim().startsWith('<'));

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Vijest</Text>
        <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadWrap}><ActivityIndicator color={PURPLE} size="large" /></View>
      ) : !item ? (
        <View style={s.loadWrap}>
          <Text style={s.errTxt}>Vijest nije pronađena</Text>
          <TouchableOpacity style={s.backBtnAlt} onPress={() => router.back()}>
            <Text style={s.backBtnAltTxt}>Nazad</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={s.body}>
            {/* Category + meta */}
            <View style={s.metaRow}>
              <View style={[s.catBadge, { backgroundColor: catStyle.bg }]}>
                <Text style={[s.catTxt, { color: catStyle.text }]}>{item.category}</Text>
              </View>
              <Text style={s.date}>{formatDate(item.created_at)}</Text>
              {item.author && <Text style={s.author}>— {item.author}</Text>}
            </View>

            {/* Title */}
            <Text style={s.title}>{item.title}</Text>

            {/* Short description / lead */}
            {item.short_description ? (
              <View style={s.leadBlock}>
                <Text style={s.leadTxt}>{item.short_description}</Text>
              </View>
            ) : null}

            {/* Divider */}
            <View style={s.divider} />

            {/* Content */}
            {item.content ? <ContentRenderer content={item.content} isHtml={isHtml} /> : null}
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
  body: { padding: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  catBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  catTxt: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 12, color: '#9CA3AF' },
  author: { fontSize: 12, color: '#9CA3AF' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', lineHeight: 30, marginBottom: 12 },
  leadBlock: { backgroundColor: '#F0EFFE', borderLeftWidth: 3, borderLeftColor: PURPLE, borderRadius: 4, padding: 12, marginBottom: 16 },
  leadTxt: { fontSize: 14, color: '#4C3D9E', lineHeight: 22, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
});
