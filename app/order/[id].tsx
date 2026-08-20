import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '@/constants/Colors';
import { useLang } from '@/contexts/LangContext';
import { api } from '@/constants/api';
import type { LangKeys } from '@/constants/i18n/ar';
import { normalizePortalService, type MobileService, type PortalServiceResponse } from '@/constants/portalServices';

interface TimelineEntry {
  id: number;
  status: string;
  note: string | null;
  createdAt: string;
  createdBy: string;
}

interface OrderFile {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  url?: string;
}

interface OrderDetail {
  id: number;
  status: string;
  total: string;
  vatAmount: string;
  walletTxId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  serviceId: number | null;
  packageId: number | null;
  timeline?: TimelineEntry[];
  files?: OrderFile[];
}

const STATUS_KEYS: Record<string, LangKeys> = {
  new: 'status_new',
  under_review: 'status_under_review',
  waiting_customer: 'status_waiting_customer',
  ready_to_start: 'status_ready_to_start',
  in_progress: 'status_in_progress',
  waiting_approval: 'status_waiting_approval',
  active: 'status_active',
  completed: 'status_completed',
  cancelled: 'status_cancelled',
};

const STATUS_GUIDANCE: Record<string, { title: string; body: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  new: { title: 'تم استلام طلبك', body: 'سيقوم فريقنا بمراجعة تفاصيله والبدء بالتحديثات من صفحة التتبع.', icon: 'inbox-arrow-down-outline' },
  under_review: { title: 'يجري مراجعة المتطلبات', body: 'سنتحقق من تفاصيل الطلب قبل الانتقال إلى الخطوة التالية.', icon: 'clipboard-text-search-outline' },
  waiting_customer: { title: 'نحتاج معلومات منك', body: 'راجع تحديثات الطلب أو تواصل مع فريقنا لإرسال التفاصيل المطلوبة.', icon: 'account-question-outline' },
  ready_to_start: { title: 'جاهز للبدء', body: 'اكتملت المراجعة وسيبدأ فريق العمل تنفيذ الطلب قريباً.', icon: 'rocket-launch-outline' },
  in_progress: { title: 'العمل جارٍ', body: 'يتابع فريقنا التنفيذ، وستظهر أي تحديثات جديدة في السجل أدناه.', icon: 'progress-wrench' },
  waiting_approval: { title: 'بانتظار اعتمادك', body: 'راجع التحديثات أو الملفات المرفقة وأرسل ملاحظاتك عند الحاجة.', icon: 'clipboard-check-outline' },
  active: { title: 'الخدمة نشطة', body: 'تستمر الخدمة وفق الباقة المختارة، وتظهر تحديثاتها هنا.', icon: 'check-decagram-outline' },
  completed: { title: 'اكتمل الطلب', body: 'تم إنهاء الطلب. تستطيع الرجوع إلى طلباتك في أي وقت.', icon: 'check-circle-outline' },
  cancelled: { title: 'تم إلغاء الطلب', body: 'يمكنك اختيار خدمة أخرى أو التواصل معنا إذا احتجت مساعدة.', icon: 'cancel' },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLang();
  const [order, setOrder]   = useState<OrderDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying]       = useState(false);
  const [services, setServices] = useState<MobileService[]>([]);

  async function handlePayNow() {
    if (!order) return;
    setPaying(true);
    const res = await api.post<{ paymentId: number; checkoutUrl: string }>('/payments/ziina/create', {
      orderId: order.id,
    });
    setPaying(false);
    if (!res.success) {
      Alert.alert(t('error'), (res as any).error?.message ?? t('serverError'));
      return;
    }
    const { paymentId, checkoutUrl } = res.data;
    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, 'dubaifans://');
    const status = result.type === 'success'
      ? (new URL(result.url).searchParams.get('status') ?? 'pending')
      : 'cancelled';
    router.push({ pathname: '/payment-result', params: { status, paymentId: String(paymentId), orderId: String(order.id) } });
  }

  const load = useCallback(async () => {
    const [orderResponse, servicesResponse] = await Promise.all([
      api.get<OrderDetail>(`/orders/${id}`),
      api.get<PortalServiceResponse[]>('/services'),
    ]);
    if (orderResponse.success) setOrder(orderResponse.data);
    if (servicesResponse.success) {
      setServices(servicesResponse.data.map(normalizePortalService).filter((service) => service.isActive));
    }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  const refresh = () => { setRefreshing(true); load(); };

  function StatusBadge({ status }: { status: string }) {
    const colorMap = Colors.status as Record<string, { bg: string; text: string }>;
    const c = colorMap[status] ?? { bg: '#F3F4F6', text: '#6B7280' };
    const key = STATUS_KEYS[status] ?? ('status_new' as LangKeys);
    return (
      <View style={[styles.badge, { backgroundColor: c.bg }]}>
        <Text style={[styles.badgeText, { color: c.text }]}>{t(key)}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.center}><Text style={styles.errorText}>الطلب غير موجود</Text></View>
      </SafeAreaView>
    );
  }

  const timeline = order.timeline ?? [];
  const files = order.files ?? [];
  const service = services.find((item) => item.id === order.serviceId);
  const packageName = service?.packages.find((item) => item.id === order.packageId)?.name;
  const statusGuidance = STATUS_GUIDANCE[order.status] ?? STATUS_GUIDANCE.new;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>#{order.id}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <StatusBadge status={order.status} />
            <Text style={styles.statusLabel}>{t('orderStatus')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.guidanceCard}>
            <View style={styles.guidanceIcon}>
              <MaterialCommunityIcons name={statusGuidance.icon} size={23} color={Colors.primary} />
            </View>
            <View style={styles.guidanceCopy}>
              <Text style={styles.guidanceTitle}>{statusGuidance.title}</Text>
              <Text style={styles.guidanceBody}>{statusGuidance.body}</Text>
            </View>
          </View>
          <View style={styles.infoGrid}>
            <InfoItem label={t('orderDate')} value={new Date(order.createdAt).toLocaleDateString('ar-AE')} />
            <InfoItem label={t('orderTotal')} value={`${parseFloat(order.total).toLocaleString('ar-AE', { minimumFractionDigits: 2 })} ${t('aed')}`} highlight />
          </View>
          {order.serviceId && <InfoItem label="الخدمة" value={service?.name ?? `رقم ${order.serviceId}`} />}
          {order.packageId && <InfoItem label="الباقة" value={packageName ?? `رقم ${order.packageId}`} />}
          {order.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>ملاحظات</Text>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          )}

          {/* Pay Now button — shown when order is not yet paid */}
          {order.walletTxId === null && order.status !== 'cancelled' && order.status !== 'completed' && (
            <TouchableOpacity
              style={[styles.payNowBtn, paying && styles.btnDisabled]}
              onPress={handlePayNow}
              disabled={paying}
            >
              {paying
                ? <ActivityIndicator color="#fff" />
                : <>
                    <MaterialCommunityIcons name="credit-card-outline" size={20} color="#fff" />
                    <Text style={styles.payNowBtnText}>{t('payNow')}</Text>
                  </>
              }
            </TouchableOpacity>
          )}
          {order.status === 'waiting_customer' && (
            <TouchableOpacity style={styles.supportBtn} onPress={() => router.push('/contact-screen' as any)}>
              <MaterialCommunityIcons name="headset" size={20} color={Colors.primary} />
              <Text style={styles.supportBtnText}>تواصل مع الدعم بخصوص هذا الطلب</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Timeline */}
        {timeline.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('orderTimeline')}</Text>
            <View style={styles.timelineCard}>
              {timeline.map((entry, i) => {
                const colorMap = Colors.status as Record<string, { bg: string; text: string }>;
                const c = colorMap[entry.status] ?? { bg: Colors.surfaceAlt, text: Colors.textMuted };
                return (
                  <View key={entry.id} style={styles.timelineEntry}>
                    <View style={styles.timelineDotWrap}>
                      {i < timeline.length - 1 && <View style={styles.timelineLine} />}
                      <View style={[styles.timelineDot, { backgroundColor: c.text }]} />
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={[styles.badge, { backgroundColor: c.bg, marginBottom: 4 }]}>
                        <Text style={[styles.badgeText, { color: c.text }]}>
                          {t(STATUS_KEYS[entry.status] ?? 'status_new' as LangKeys)}
                        </Text>
                      </View>
                      {entry.note && <Text style={styles.timelineNote}>{entry.note}</Text>}
                      <Text style={styles.timelineDate}>
                        {new Date(entry.createdAt).toLocaleString('ar-AE')}
                        {entry.createdBy && entry.createdBy !== 'system' && ` · ${entry.createdBy}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Files */}
        {files.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('orderFiles')}</Text>
            <View style={styles.filesCard}>
              {files.map(file => (
                <View key={file.id} style={styles.fileRow}>
                  <Text style={styles.fileSize}>{(file.fileSize / 1024).toFixed(0)} KB</Text>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.fileName}</Text>
                    <Text style={styles.fileDate}>{new Date(file.createdAt).toLocaleDateString('ar-AE')}</Text>
                  </View>
                  <View style={styles.fileIconWrap}>
                    <MaterialCommunityIcons
                      name={file.mimeType?.startsWith('image') ? 'image' : 'file-document-outline'}
                      size={24}
                      color={Colors.primary}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {order.status !== 'cancelled' && (
          <TouchableOpacity style={styles.requestAnotherBtn} onPress={() => router.push('/(tabs)/request' as any)}>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.requestAnotherText}>اطلب خدمة إضافية</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoItem}>
      <Text style={[styles.infoValue, highlight && { color: Colors.primary }]}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'Cairo_400Regular', fontSize: 16, color: Colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 17, paddingBottom: 12, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontFamily: 'Cairo_800ExtraBold', fontSize: 21, color: Colors.textPrimary, textAlign: 'right' },
  scroll: { paddingHorizontal: 16, paddingBottom: 44 },
  payNowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14,
    marginTop: 16,
  },
  payNowBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#fff' },
  btnDisabled: { opacity: 0.6 },
  supportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: Colors.primary, borderRadius: 12, paddingVertical: 12, marginTop: 12 },
  supportBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 13, color: Colors.primary },
  statusCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 19,
    shadowColor: '#171827', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.055, shadowRadius: 11, elevation: 3,
    marginBottom: 16,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusLabel: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13 },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 16 },
  guidanceCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF4F4', borderRadius: 14, padding: 13, marginBottom: 16 },
  guidanceIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE9E9' },
  guidanceCopy: { flex: 1, alignItems: 'flex-end' },
  guidanceTitle: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: Colors.textPrimary, textAlign: 'right' },
  guidanceBody: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: Colors.textSecondary, textAlign: 'right', lineHeight: 18, marginTop: 2 },
  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  infoItem: { flex: 1 },
  infoLabel: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: Colors.textMuted, textAlign: 'right' },
  infoValue: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: Colors.textPrimary, textAlign: 'right' },
  notesBox: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 12, marginTop: 12 },
  notesLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: Colors.textMuted, textAlign: 'right', marginBottom: 4 },
  notesText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textPrimary, textAlign: 'right', lineHeight: 20 },
  sectionTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: Colors.textPrimary, textAlign: 'right', marginBottom: 12 },
  timelineCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 16,
    shadowColor: '#171827', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.055, shadowRadius: 11, elevation: 3,
    marginBottom: 16,
  },
  timelineEntry: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timelineDotWrap: { alignItems: 'center', width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border, position: 'absolute', top: 16, left: 7 },
  timelineContent: { flex: 1 },
  timelineNote: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 4, lineHeight: 19 },
  timelineDate: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
  filesCard: {
    backgroundColor: Colors.surface, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#171827', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.055, shadowRadius: 11, elevation: 3,
    marginBottom: 16,
  },
  fileRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  fileIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1, paddingHorizontal: 10, alignItems: 'flex-end' },
  fileName: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.textPrimary },
  fileDate: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  fileSize: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: Colors.textMuted },
  requestAnotherBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.primary, borderRadius: 14, paddingVertical: 14, marginTop: 4, marginBottom: 12 },
  requestAnotherText: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: Colors.primary },
});
