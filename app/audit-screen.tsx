/**
 * Free Instagram audit screen.
 */
import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Linking, Keyboard, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { API_BASE } from '@/constants/api';

interface AuditResult {
  username?: string;
  handle?: string;
  followers?: number | string;
  following?: number | string;
  posts?: number | string;
  engagement_rate?: number | string;
  bio?: string;
  full_name?: string;
  profile_pic_url?: string;
  is_verified?: boolean;
  is_private?: boolean;
  insights?: string[];
  recommendations?: string[];
  score?: number;
  error?: string;
  [key: string]: any;
}

export default function AuditScreen() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');

  async function runAudit() {
    const handle = username.trim().replace('@', '');
    if (!handle) { Alert.alert('خطأ', 'يرجى إدخال اسم المستخدم'); return; }
    setLoading(true);
    setResult(null);
    setError('');
    Keyboard.dismiss();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(`${API_BASE}/api/instagram/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: handle }),
        signal: controller.signal,
      });
      const contentType = res.headers.get('content-type') ?? '';
      console.log(`[AUDIT] STATUS=${res.status} CONTENT_TYPE=${contentType.split(';')[0] || 'unknown'}`);
      if (!contentType.includes('application/json')) {
        console.error('[AUDIT] ERROR code=UNEXPECTED_RESPONSE');
        setError('تعذّر تحليل الحساب حالياً. يرجى المحاولة لاحقاً.');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        const message = typeof data?.error === 'string'
          ? data.error
          : data?.error?.message ?? data?.message ?? 'تعذّر تحليل الحساب';
        console.error(`[AUDIT] ERROR status=${res.status}`);
        setError(message);
        return;
      }
      if (!data?.profile) {
        console.error('[AUDIT] ERROR code=INVALID_RESPONSE');
        setError('تعذّر تحليل الحساب حالياً. يرجى المحاولة لاحقاً.');
        return;
      }
      setResult(normalizeAuditResult(data));
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'AbortError';
      console.error(`[AUDIT] ERROR code=${timedOut ? 'TIMEOUT' : 'NETWORK_ERROR'}`);
      setError(timedOut ? 'استغرق الفحص وقتاً أطول من المعتاد. يرجى المحاولة مجدداً.' : 'تعذّر الاتصال بالخادم');
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>فحص مجاني</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>اكتشف مستوى حضورك الرقمي</Text>
          <Text style={styles.cardDesc}>أدخل اسم المستخدم للحصول على تحليل مجاني لحسابك</Text>

          <View style={styles.platformLabel}>
            <MaterialCommunityIcons name="instagram" size={18} color={Colors.primary} />
            <Text style={styles.platformText}>فحص حساب إنستغرام</Text>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="@اسم_المستخدم"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="right"
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={runAudit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>ابدأ الفحص المجاني</Text>}
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {result && !result.error && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>نتائج التحليل</Text>
            {result.full_name && <ResultRow label="الاسم" value={result.full_name} />}
            {result.followers != null && <ResultRow label="المتابعون" value={Number(result.followers).toLocaleString('ar-AE')} />}
            {result.following != null && <ResultRow label="يتابع" value={Number(result.following).toLocaleString('ar-AE')} />}
            {result.posts != null && <ResultRow label="المنشورات" value={Number(result.posts).toLocaleString('ar-AE')} />}
            {result.engagement_rate != null && <ResultRow label="معدل التفاعل" value={`${Number(result.engagement_rate).toFixed(2)}%`} highlight />}
            {result.is_verified && <ResultRow label="التحقق" value="✓ حساب موثق" />}
            {result.score != null && <ResultRow label="التقييم" value={`${result.score}/100`} highlight />}

            {(result.insights ?? []).length > 0 && (
              <>
                <Text style={styles.insightTitle}>الملاحظات</Text>
                {result.insights!.map((ins: string, i: number) => (
                  <View key={i} style={styles.insightRow}>
                    <Text style={styles.insightText}>{ins}</Text>
                    <MaterialCommunityIcons name="lightbulb-outline" size={16} color={Colors.warning} />
                  </View>
                ))}
              </>
            )}

            {(result.recommendations ?? []).length > 0 && (
              <>
                <Text style={styles.insightTitle}>التوصيات</Text>
                {result.recommendations!.map((rec: string, i: number) => (
                  <View key={i} style={styles.insightRow}>
                    <Text style={styles.insightText}>{rec}</Text>
                    <MaterialCommunityIcons name="check-circle-outline" size={16} color={Colors.success} />
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizeAuditResult(data: any): AuditResult {
  const profile = data.profile ?? {};
  const metrics = data.metrics ?? {};
  const analysis = data.aiAnalysis ?? {};
  return {
    username: profile.username,
    full_name: profile.displayName,
    followers: profile.followers,
    following: profile.following,
    posts: profile.postsCount,
    bio: profile.bio,
    profile_pic_url: profile.profilePictureUrl,
    is_verified: profile.isVerified,
    is_private: profile.isPrivate,
    engagement_rate: metrics.engagementRate ?? metrics.engagement_rate ?? metrics.engagement?.rate,
    score: data.overallScore,
    insights: Array.isArray(analysis.insights) ? analysis.insights : [],
    recommendations: Array.isArray(data.aiRecommendations) ? data.aiRecommendations : [],
  };
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.resultRow}>
      <Text style={[styles.resultValue, highlight && { color: Colors.primary, fontFamily: 'Cairo_700Bold' }]}>{value}</Text>
      <Text style={styles.resultLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.primary, padding: 16 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: 'Cairo_700Bold', fontSize: 20, color: '#fff', flex: 1, textAlign: 'right' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginBottom: 16,
  },
  cardTitle: { fontFamily: 'Cairo_700Bold', fontSize: 20, color: Colors.textPrimary, textAlign: 'right', marginBottom: 6 },
  cardDesc: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'right', marginBottom: 20 },
  platformLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 16 },
  platformText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.primary },
  inputWrap: {
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, marginBottom: 16,
  },
  input: { fontFamily: 'Cairo_400Regular', fontSize: 15, color: Colors.textPrimary, padding: 14, textAlign: 'right' },
  btn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 12,
  },
  errorText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.error, flex: 1, textAlign: 'right' },
  resultCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  resultTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: Colors.textPrimary, textAlign: 'right', marginBottom: 12 },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  resultLabel: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted },
  resultValue: { fontFamily: 'Cairo_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  insightTitle: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: Colors.textPrimary, textAlign: 'right', marginTop: 16, marginBottom: 8 },
  insightRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  insightText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textSecondary, flex: 1, textAlign: 'right', lineHeight: 20 },
});
