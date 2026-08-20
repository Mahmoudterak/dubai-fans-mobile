import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { useLang } from '@/contexts/LangContext';
import { api } from '@/constants/api';
import {
  type MobilePackage as Package,
  type MobileService as ServiceDetail,
  type PortalServiceResponse,
  normalizePortalService,
} from '@/constants/portalServices';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLang();
  const [svc, setSvc] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState('0.00');

  useEffect(() => {
    Promise.all([
      api.get<PortalServiceResponse>(`/services/${id}`),
      api.get<{ balance: string }>('/wallet'),
    ]).then(([sRes, wRes]) => {
      if (sRes.success) setSvc(normalizePortalService(sRes.data));
      if (wRes.success) setWalletBalance(wRes.data.balance);
      setLoading(false);
    });
  }, [id]);

  async function orderPackage(pkg: Package) {
    const price = parseFloat(pkg.price);
    const balance = parseFloat(walletBalance);

    if (balance < price) {
      Alert.alert(t('insufficientBalance'), t('insufficientBalanceMsg'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('addBalance'), onPress: () => router.push('/(tabs)/wallet' as any) },
      ]);
      return;
    }

    Alert.alert(
      t('orderNow'),
      `سيتم خصم ${parseFloat(pkg.price).toLocaleString('ar-AE', { minimumFractionDigits: 2 })} ${t('aed')} من محفظتك.\n\nهل تريد المتابعة؟`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: async () => {
            setOrdering(pkg.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const res = await api.post<{ id: number; referenceCode: string }>('/orders', {
              packageId: pkg.id,
              notes: '',
            });
            setOrdering(null);
            if (res.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(t('orderCreated'), t('orderCreatedMsg'), [
                { text: t('goToOrders'), onPress: () => router.replace('/(tabs)/orders' as any) },
              ]);
            } else {
              Alert.alert(t('error'), (res as any).error?.message ?? t('serverError'));
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!svc) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.center}><Text style={styles.errorText}>{t('error')}</Text></View>
      </SafeAreaView>
    );
  }

  const tierColors = [
    { bg: '#F0FDF4', border: '#86EFAC', name: '#15803D' },
    { bg: '#EFF6FF', border: '#93C5FD', name: '#1D4ED8' },
    { bg: '#FFF7ED', border: '#FCA86F', name: '#C2410C' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{svc.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Balance strip */}
        <View style={styles.balanceStrip}>
          <Text style={styles.balanceLabel}>{t('walletBalance')}</Text>
          <Text style={styles.balanceVal}>
            {parseFloat(walletBalance).toLocaleString('ar-AE', { minimumFractionDigits: 2 })} {t('aed')}
          </Text>
        </View>

        {svc.description && (
          <Text style={styles.desc}>{svc.description}</Text>
        )}

        <Text style={styles.sectionTitle}>{t('selectPackage')}</Text>

        {(svc.packages ?? []).filter(p => p.isActive !== false).map((pkg, idx) => {
          const color = tierColors[idx % tierColors.length];
          const isLoading = ordering === pkg.id;
          return (
            <View key={pkg.id} style={[styles.packageCard, { borderColor: color.border, backgroundColor: color.bg }]}>
              <View style={styles.pkgHeader}>
                <View style={styles.pkgPriceWrap}>
                  <Text style={[styles.pkgPriceCurrency, { color: color.name }]}>{t('aed')}</Text>
                  <Text style={[styles.pkgPrice, { color: color.name }]}>
                    {parseFloat(pkg.price).toLocaleString('ar-AE', { minimumFractionDigits: 0 })}
                  </Text>
                </View>
                <View>
                  <Text style={styles.pkgName}>{pkg.name}</Text>
                  <Text style={styles.pkgCycle}>
                    {pkg.billingCycle === 'monthly' ? t('perMonth') : t('oneTime')}
                  </Text>
                </View>
              </View>

              {pkg.description && <Text style={styles.pkgDesc}>{pkg.description}</Text>}

              {(pkg.features ?? []).length > 0 && (
                <View style={styles.featuresList}>
                  {pkg.features.map((f, fi) => (
                    <View key={fi} style={styles.featureRow}>
                      <Text style={styles.featureText}>{f}</Text>
                      <MaterialCommunityIcons name="check-circle" size={18} color={color.name} />
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.orderBtn, { backgroundColor: color.name }, isLoading && { opacity: 0.7 }]}
                onPress={() => orderPackage(pkg)}
                disabled={!!ordering}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.orderBtnText}>{t('orderNow')}</Text>}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'Cairo_400Regular', fontSize: 16, color: Colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontFamily: 'Cairo_700Bold', fontSize: 20, color: Colors.textPrimary, textAlign: 'right' },
  scroll: { padding: 16, paddingBottom: 40 },
  balanceStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: Colors.primary,
  },
  balanceLabel: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textMuted },
  balanceVal: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: Colors.primary },
  desc: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'right', marginBottom: 16, lineHeight: 22 },
  sectionTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: Colors.textPrimary, textAlign: 'right', marginBottom: 16 },
  packageCard: { borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 2 },
  pkgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  pkgName: { fontFamily: 'Cairo_800ExtraBold', fontSize: 20, color: Colors.textPrimary, textAlign: 'right' },
  pkgCycle: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'right' },
  pkgPriceWrap: { alignItems: 'flex-end', flexDirection: 'row', gap: 4 },
  pkgPrice: { fontFamily: 'Cairo_800ExtraBold', fontSize: 32, lineHeight: 38 },
  pkgPriceCurrency: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, paddingBottom: 4 },
  pkgDesc: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 12, lineHeight: 20 },
  featuresList: { gap: 8, marginBottom: 16 },
  featureRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  featureText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textPrimary, flex: 1, textAlign: 'right' },
  orderBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  orderBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
});
