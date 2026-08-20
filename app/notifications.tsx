import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { useLang } from '@/contexts/LangContext';
import { api } from '@/constants/api';

interface Notification {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  data: Record<string, any> | null;
}

const TYPE_ICONS: Record<string, string> = {
  order: 'clipboard-check',
  wallet: 'wallet',
  system: 'bell',
  support: 'headset',
};

export default function NotificationsScreen() {
  const { t } = useLang();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async (append = false) => {
    const res = await api.get<Notification[]>('/notifications?limit=30');
    if (res.success) {
      if (append) setNotifications(n => [...n, ...res.data]);
      else setNotifications(res.data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { setRefreshing(true); load(); };

  async function markRead(notif: Notification) {
    if (notif.isRead) return;
    const response = await api.put(`/notifications/${notif.id}/read`, {});
    if (response.success) {
      setNotifications(n => n.map(x => x.id === notif.id ? { ...x, isRead: true } : x));
    }
    if (notif.data?.orderId) {
      Haptics.selectionAsync();
      router.push(`/order/${notif.data.orderId}` as any);
    }
  }

  async function markAllRead() {
    setMarking(true);
    const response = await api.put('/notifications/read-all', {});
    if (response.success) {
      setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    } else {
      Alert.alert(t('error'), response.error.message ?? t('serverError'));
    }
    setMarking(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} disabled={marking} style={styles.markAllBtn}>
            {marking
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Text style={styles.markAllText}>{t('markAllRead')}</Text>}
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notificationsList')}</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <MaterialCommunityIcons name="bell-outline" size={72} color={Colors.border} />
            <Text style={styles.emptyText}>{t('noNotifications')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const icon = TYPE_ICONS[item.type] ?? 'bell';
          return (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.cardUnread]}
              onPress={() => markRead(item)}
              activeOpacity={0.75}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardDate}>
                  {new Date(item.createdAt).toLocaleDateString('ar-AE')}
                </Text>
                {!item.isRead && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.body}</Text>
              </View>
              <View style={[styles.iconWrap, !item.isRead && { backgroundColor: '#FFF0F0' }]}>
                <MaterialCommunityIcons name={icon as any} size={22} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontFamily: 'Cairo_800ExtraBold', fontSize: 22, color: Colors.textPrimary, textAlign: 'right' },
  markAllBtn: { paddingHorizontal: 4 },
  markAllText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: Colors.primary },
  list: { padding: 16, gap: 8 },
  emptyContainer: { flex: 1 },
  emptyInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontFamily: 'Cairo_400Regular', fontSize: 16, color: Colors.textMuted, marginTop: 16 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  cardDesc: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'right', lineHeight: 19 },
  cardLeft: { alignItems: 'flex-end', flexShrink: 0 },
  cardDate: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: Colors.textMuted },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
});
