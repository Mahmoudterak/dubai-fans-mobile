import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useLang } from '@/contexts/LangContext';
import { api } from '@/constants/api';
import type { LangKeys } from '@/constants/i18n/ar';

interface Order {
  id: number;
  status: string;
  total: string;
  createdAt: string;
  serviceId?: number | null;
  packageId?: number | null;
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

export default function OrdersScreen() {
  const { t } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (p = 1, append = false) => {
    const res = await api.get<Order[]>(`/orders?page=${p}&limit=15`);
    if (res.success) {
      const items = res.data;
      if (append) setOrders(o => [...o, ...items]);
      else setOrders(items);
      const meta = (res as any).meta;
      setHasMore(meta ? p < meta.pages : false);
      setPage(p);
    }
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => { load(1); }, [load]);

  const refresh = () => { setRefreshing(true); load(1); };
  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    load(page + 1, true);
  };

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

  function OrderCard({ item }: { item: Order }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/order/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <StatusBadge status={item.status} />
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardRef}>#{item.id}</Text>
            {item.serviceId ? <Text style={styles.cardService}>خدمة رقم {item.serviceId}</Text> : null}
          </View>
        </View>
        <View style={styles.cardBottom}>
          <View style={styles.cardArrow}>
            <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />
            <Text style={styles.cardDate}>
              {new Date(item.createdAt).toLocaleDateString('ar-AE')}
            </Text>
          </View>
          <Text style={styles.cardAmount}>
            {parseFloat(item.total).toLocaleString('ar-AE', { minimumFractionDigits: 2 })} {t('aed')}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
        <Text style={styles.headerTitle}>{t('myOrdersList')}</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <OrderCard item={item} />}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={72} color={Colors.border} />
            <Text style={styles.emptyTitle}>{t('noOrders')}</Text>
            <Text style={styles.emptyDesc}>{t('noOrdersDesc')}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/request' as any)}>
              <Text style={styles.emptyBtnText}>{t('requestService')}</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.primary} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontFamily: 'Cairo_800ExtraBold', fontSize: 22, color: Colors.textPrimary, textAlign: 'right' },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  emptyInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: Colors.textPrimary, marginTop: 16, textAlign: 'center' },
  emptyDesc: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted, marginTop: 8, textAlign: 'center' },
  emptyBtn: { marginTop: 24, backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  emptyBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#fff' },

  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginBottom: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardRight: { alignItems: 'flex-end' },
  cardLeft: { alignItems: 'flex-start' },
  cardRef: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: Colors.textPrimary },
  cardService: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  cardAmount: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: Colors.primary },
  cardArrow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDate: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: Colors.textMuted },
});
