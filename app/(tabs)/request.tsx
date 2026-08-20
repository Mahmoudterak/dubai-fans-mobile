import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { openExternalUrl } from '@/constants/externalLinks';
import { useLang } from '@/contexts/LangContext';
import { api } from '@/constants/api';
import {
  type PortalServiceResponse,
  normalizePortalService,
} from '@/constants/portalServices';
import { getServiceRequestCards, type ServiceRequestCard } from '@/constants/serviceCatalog';

export default function RequestScreen() {
  const { t } = useLang();
  const [services, setServices] = useState<ServiceRequestCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  function loadServices() {
    setLoading(true);
    setLoadError('');
    api.get<PortalServiceResponse[]>('/services').then(res => {
      console.log(`[SERVICES] STATUS=${res.status ?? 'no_response'}`);
      if (res.success) {
        const mapped = getServiceRequestCards(res.data.map(normalizePortalService).filter(service => service.isActive));
        console.log(`[SERVICES] RESPONSE_COUNT=${mapped.length}`);
        setServices(mapped);
      } else {
        console.error(`[SERVICES] ERROR code=${res.error.code}`);
        setLoadError('تعذّر تحميل الخدمات. اسحب للأسفل للمحاولة مجدداً.');
      }
      setLoading(false);
    });
  }

  useEffect(() => {
    loadServices();
  }, []);

  async function handlePress(svc: ServiceRequestCard) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{t('services')}</Text>
      </View>
      <Text style={styles.subtitle}>اختر الخدمة التي تناسب نشاطك التجاري</Text>

      <FlatList
        data={services}
        keyExtractor={item => item.key}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          return (
            <TouchableOpacity
              style={[styles.card, !item.isAvailable && styles.cardUnavailable]}
              disabled={!item.isAvailable}
              onPress={() => handlePress(item)}
              activeOpacity={0.8}
            >
              {item.key === 'advertising' && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredText}>الأكثر طلباً</Text>
                </View>
              )}
              <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                <MaterialCommunityIcons name={item.icon as any} size={36} color={Colors.primary} />
              </View>
              <Text style={styles.cardName}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.isAvailable ? item.description : 'هذه الخدمة غير متاحة حالياً'}
              </Text>
              {item.isAvailable && item.features.length > 0 && (
                <View style={styles.featureList}>
                  {item.features.slice(0, 2).map((feature) => (
                    <Text key={feature} style={styles.featureText} numberOfLines={1}>• {feature}</Text>
                  ))}
                </View>
              )}
              {item.isAvailable && item.startingPrice && (
                <Text style={styles.startingPrice}>
                  يبدأ من {Number(item.startingPrice).toLocaleString('ar-AE')} {t('aed')}
                </Text>
              )}
              <View style={styles.cardFooter}>
                <MaterialCommunityIcons name="arrow-left" size={18} color={Colors.primary} />
                <Text style={styles.cardCta}>{item.isAvailable ? item.cta : 'غير متاحة'}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name={loadError ? 'alert-circle-outline' : 'briefcase-outline'} size={34} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{loadError || 'لا توجد خدمات متاحة حالياً.'}</Text>
            {loadError ? (
              <TouchableOpacity style={styles.retryButton} onPress={loadServices}>
                <Text style={styles.retryText}>{t('retry')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.expertCard} onPress={() => router.push('/contact-screen' as any)}>
            <View style={styles.expertIcon}><MaterialCommunityIcons name="headset" size={22} color={Colors.primary} /></View>
            <View style={styles.expertCopy}>
              <Text style={styles.expertTitle}>تحتاج مساعدة في الاختيار؟</Text>
              <Text style={styles.expertBody}>اسأل خبيرًا قبل بدء الطلب.</Text>
            </View>
            <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.primary} />
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
   headerRow: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 },
   headerTitle: { fontFamily: 'Cairo_800ExtraBold', fontSize: 23, color: Colors.textPrimary, textAlign: 'right' },
   subtitle: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'right', paddingHorizontal: 20, marginBottom: 18 },
   grid: { paddingHorizontal: 12, paddingBottom: 28 },
   row: { gap: 11, marginBottom: 11 },
  card: {
     flex: 1, backgroundColor: Colors.surface, borderRadius: 19, padding: 17,
     shadowColor: '#171827', shadowOffset: { width: 0, height: 3 },
     shadowOpacity: 0.06, shadowRadius: 11, elevation: 4,
    position: 'relative', overflow: 'hidden',
  },
  cardUnavailable: { opacity: 0.6 },
  featuredBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  featuredText: { fontFamily: 'Cairo_600SemiBold', fontSize: 10, color: '#fff' },
  iconCircle: {
     width: 62, height: 62, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, alignSelf: 'flex-end',
  },
   cardName: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: Colors.textPrimary, textAlign: 'right', marginBottom: 6, lineHeight: 22 },
  cardDesc: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginBottom: 12, lineHeight: 18 },
  featureList: { alignItems: 'flex-end', gap: 2, marginTop: -6, marginBottom: 10 },
  featureText: { fontFamily: 'Cairo_400Regular', fontSize: 10, color: Colors.textSecondary, textAlign: 'right', maxWidth: '100%' },
  startingPrice: { fontFamily: 'Cairo_700Bold', fontSize: 12, color: Colors.textPrimary, textAlign: 'right', marginBottom: 9 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardCta: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: Colors.primary },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 72, gap: 10 },
  emptyText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  retryButton: { marginTop: 6, borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 },
  retryText: { fontFamily: 'Cairo_600SemiBold', color: Colors.primary, fontSize: 13 },
  expertCard: {
     flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 8, marginTop: 14,
     backgroundColor: Colors.textPrimary, borderWidth: 1, borderColor: Colors.textPrimary, borderRadius: 17, padding: 15,
  },
   expertIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  expertCopy: { flex: 1, alignItems: 'flex-end' },
   expertTitle: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#fff', textAlign: 'right' },
   expertBody: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginTop: 2 },
});
