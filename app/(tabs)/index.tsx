import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Pressable, Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { PROOF_STATS } from '@/constants/config';
import { openExternalUrl } from '@/constants/externalLinks';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/contexts/LangContext';
import { api } from '@/constants/api';
import {
  type PortalServiceResponse,
  normalizePortalService,
} from '@/constants/portalServices';
import { getServiceRequestCards, type ServiceRequestCard } from '@/constants/serviceCatalog';

interface Stats {
  activeOrders: number;
  unreadNotifications: number;
  balance: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { t } = useLang();
  const [stats, setStats] = useState<Stats>({ activeOrders: 0, unreadNotifications: 0, balance: '0.00' });
  const [services, setServices] = useState<ServiceRequestCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [walletRes, notifRes, ordersRes, svcRes] = await Promise.all([
      api.get<{ balance: string }>('/wallet'),
      api.get<unknown>('/notifications?limit=1'),
      api.get<unknown[]>('/orders?status=in_progress,ready_to_start,under_review,new&limit=1'),
      api.get<PortalServiceResponse[]>('/services'),
    ]);
    const balance = walletRes.success ? walletRes.data.balance : '0.00';
    const unread = notifRes.success && (notifRes as any).meta?.unread != null
      ? (notifRes as any).meta.unread : 0;
    const active = ordersRes.success && (ordersRes as any).meta?.total != null
      ? (ordersRes as any).meta.total : 0;
    setStats({ balance, unreadNotifications: unread, activeOrders: active });
    if (svcRes.success) {
      setServices(getServiceRequestCards(
        svcRes.data.map(normalizePortalService).filter((service) => service.isActive),
      ));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function action(route: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  }

  async function openService(svc: ServiceRequestCard) {
    Haptics.selectionAsync();
    if (svc.action === 'request') {
      router.push(`/service-request/${svc.key}` as any);
      return;
    }
    if (svc.action === 'contact') {
      router.push({ pathname: '/contact-screen', params: { topic: svc.title } } as any);
      return;
    }
    if (!svc.externalUrl) {
      Alert.alert('الرابط غير متاح', 'لا يتوفر رابط لهذه الخدمة حالياً.');
      return;
    }
    try {
      await openExternalUrl(svc.externalUrl);
    } catch {
      // openExternalUrl handles the browser fallback without an error alert.
    }
  }

  const firstName = user?.fullName?.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => action('/notifications')} style={styles.notifBtn}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.textPrimary} />
            {stats.unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {stats.unreadNotifications > 9 ? '9+' : stats.unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.greetWrap}>
            <Text style={styles.greetName}>{firstName}</Text>
             <Text style={styles.greetLabel}>مرحباً</Text>
          </View>
        </View>

        {/* Wallet card */}
        <View style={styles.walletCard}>
          <View style={styles.walletTop}>
            <TouchableOpacity
              style={styles.walletAddBtn}
              onPress={() => action('/(tabs)/wallet')}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={styles.walletAddText}>{t('addBalance')}</Text>
            </TouchableOpacity>
            <View style={styles.walletInfo}>
              <Text style={styles.walletAmount}>
                {parseFloat(stats.balance).toLocaleString('ar-AE', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.walletCurrency}>{t('aed')}</Text>
            </View>
          </View>
          <Text style={styles.walletLabel}>{t('walletBalance')}</Text>
          {/* Bottom row */}
          <View style={styles.walletStats}>
            <View style={styles.walletStat}>
              <Text style={styles.walletStatVal}>{stats.unreadNotifications}</Text>
              <Text style={styles.walletStatLabel}>{t('notifications')}</Text>
            </View>
            <View style={styles.walletDivider} />
            <View style={styles.walletStat}>
              <Text style={styles.walletStatVal}>{stats.activeOrders}</Text>
              <Text style={styles.walletStatLabel}>{t('activeOrders')}</Text>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: 'clipboard-list', label: t('myOrders'), route: '/(tabs)/orders' },
            { icon: 'wallet', label: t('myWallet'), route: '/(tabs)/wallet' },
            { icon: 'bell', label: t('notifications'), route: '/notifications' },
            { icon: 'account', label: t('account'), route: '/(tabs)/account' },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickItem}
              onPress={() => action(item.route)}
            >
              <View style={styles.quickIcon}>
                <MaterialCommunityIcons name={item.icon as any} size={26} color={Colors.primary} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Services */}
        <View style={styles.growthIntro}>
          <Text style={styles.growthTitle}>ماذا تريد أن تنمّي اليوم؟</Text>
          <Text style={styles.growthBody}>اختر الخدمة المناسبة وابدأ بخطوات واضحة من داخل التطبيق.</Text>
        </View>
        <View style={styles.sectionRow}>
          <TouchableOpacity onPress={() => action('/(tabs)/request')}>
            <Text style={styles.viewAll}>{t('viewAll')}</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>{t('ourServices')}</Text>
        </View>
        <View style={styles.serviceGrid}>
          {services.map(svc => (
            <Pressable
              key={svc.key}
              style={[styles.serviceCard, !svc.isAvailable && styles.serviceUnavailable]}
              disabled={!svc.isAvailable}
              onPress={() => openService(svc)}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: svc.color }]}>
                <MaterialCommunityIcons
                  name={svc.icon as any}
                  size={28}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.serviceName} numberOfLines={2}>{svc.title}</Text>
              <Text style={styles.serviceDescription} numberOfLines={2}>
                {svc.isAvailable ? svc.description : 'غير متاحة حالياً'}
              </Text>
              {svc.isAvailable && svc.startingPrice && (
                <Text style={styles.startingPrice}>
                  يبدأ من {Number(svc.startingPrice).toLocaleString('ar-AE')} {t('aed')}
                </Text>
              )}
              {svc.isAvailable && (
                <View style={styles.serviceCta}>
                  <Text style={styles.serviceCtaText}>{svc.cta}</Text>
                  <MaterialCommunityIcons name="arrow-left" size={15} color={Colors.primary} />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.proofSection}>
          <Text style={styles.proofTitle}>أرقام حقيقية</Text>
          <Text style={styles.proofSubtitle}>نتائج موثّقة تتحدث عن نفسها</Text>
          <View style={styles.proofGrid}>
            {PROOF_STATS.map((stat) => (
              <View key={stat.title} style={styles.proofCard}>
                <Text style={styles.proofValue}>{stat.value}</Text>
                <Text style={styles.proofCardTitle}>{stat.title}</Text>
                <Text style={styles.proofCardDescription}>{stat.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.whyCard}>
          <Text style={styles.whyTitle}>لماذا Dubai Fans؟</Text>
          {[
            'خدمات رقمية متكاملة',
            'أسعار واضحة من الباقات المتاحة',
            'متابعة الطلب من التطبيق',
            'دعم مباشر عند الحاجة',
            'تقارير الأداء حسب الخدمة',
            'حلول مناسبة للشركات والأعمال',
          ].map((item) => (
            <View key={item} style={styles.whyRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color={Colors.success} />
              <Text style={styles.whyText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 34 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 16, paddingBottom: 8,
  },
  notifBtn: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: Colors.primary, borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'Cairo_700Bold' },
  greetWrap: { alignItems: 'flex-end' },
  greetLabel: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted },
  greetName: { fontFamily: 'Cairo_800ExtraBold', fontSize: 20, color: Colors.textPrimary },

  walletCard: {
    marginHorizontal: 20, marginVertical: 14, borderRadius: 22,
    backgroundColor: Colors.primary, padding: 24,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  walletInfo: { alignItems: 'flex-end' },
  walletAmount: { fontFamily: 'Cairo_800ExtraBold', fontSize: 36, color: '#fff', lineHeight: 42 },
  walletCurrency: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  walletLabel: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 2 },
  walletAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  walletAddText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: '#fff' },
  walletStats: { flexDirection: 'row', marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 16 },
  walletStat: { flex: 1, alignItems: 'center' },
  walletStatVal: { fontFamily: 'Cairo_800ExtraBold', fontSize: 22, color: '#fff' },
  walletStatLabel: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  walletDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  sectionTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: Colors.textPrimary, textAlign: 'right', paddingHorizontal: 20, marginTop: 22, marginBottom: 13 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 22, marginBottom: 13 },
  viewAll: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: Colors.primary },
  growthIntro: { marginHorizontal: 20, marginTop: 18, borderRightWidth: 3, borderRightColor: Colors.primary, paddingRight: 14 },
  growthTitle: { fontFamily: 'Cairo_800ExtraBold', fontSize: 23, color: Colors.textPrimary, textAlign: 'right', lineHeight: 33 },
  growthBody: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'right', lineHeight: 20, marginTop: 3 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  quickItem: {
    flex: 1, minWidth: '20%', maxWidth: '25%',
    backgroundColor: Colors.surface, borderRadius: 18,
    alignItems: 'center', paddingVertical: 15,
    marginHorizontal: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055, shadowRadius: 10, elevation: 3,
  },
  quickIcon: {
    width: 50, height: 50, borderRadius: 15,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  quickLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 11, color: Colors.textPrimary, textAlign: 'center' },

  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  serviceCard: {
    width: '47%', marginHorizontal: '1.5%', marginBottom: 11,
    backgroundColor: Colors.surface, borderRadius: 18, padding: 16,
    alignItems: 'flex-end',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055, shadowRadius: 10, elevation: 3,
  },
  serviceIconWrap: {
    width: 54, height: 54, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  serviceName: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.textPrimary, textAlign: 'right' },
  serviceDescription: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4, lineHeight: 17 },
  startingPrice: { fontFamily: 'Cairo_700Bold', fontSize: 12, color: Colors.textPrimary, textAlign: 'right', marginTop: 10 },
  serviceCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 8 },
  serviceCtaText: { fontFamily: 'Cairo_700Bold', fontSize: 12, color: Colors.primary },
  serviceUnavailable: { opacity: 0.6 },
  proofSection: { marginTop: 16, paddingHorizontal: 20 },
  proofTitle: { fontFamily: 'Cairo_800ExtraBold', fontSize: 21, color: Colors.textPrimary, textAlign: 'right' },
  proofSubtitle: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'right', marginTop: 2, marginBottom: 12 },
  proofGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  proofCard: {
    width: '48%', flexGrow: 1, minHeight: 126, backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    alignItems: 'flex-end', borderWidth: 1, borderColor: '#F3E4E4',
  },
  proofValue: { fontFamily: 'Cairo_800ExtraBold', fontSize: 24, color: Colors.primary, textAlign: 'right' },
  proofCardTitle: { fontFamily: 'Cairo_700Bold', fontSize: 13, color: Colors.textPrimary, textAlign: 'right', marginTop: 2 },
  proofCardDescription: { fontFamily: 'Cairo_400Regular', fontSize: 10, lineHeight: 16, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  whyCard: {
    margin: 20, marginTop: 30, backgroundColor: Colors.textPrimary, borderRadius: 18, padding: 19,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  whyTitle: { fontFamily: 'Cairo_800ExtraBold', fontSize: 18, color: '#fff', textAlign: 'right', marginBottom: 12 },
  whyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 9 },
  whyText: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.78)', textAlign: 'right' },
});
