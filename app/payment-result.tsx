/**
 * Payment Result Screen
 * Shown after Ziina redirects back to the app via dubaifans://payment/result?status=...
 * Polls the backend to confirm the payment status, then shows success or failure UI.
 */
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { useLang } from '@/contexts/LangContext';
import { api } from '@/constants/api';

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

interface PaymentStatusData {
  id: number;
  status: PaymentStatus;
  amount: string;
  currency: string;
  orderId: number | null;
  completedAt: string | null;
}

const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = 30; // 60 seconds max

export default function PaymentResultScreen() {
  const { t } = useLang();
  const { status: initialStatus, paymentId } = useLocalSearchParams<{ status: string; paymentId: string }>();
  const [status, setStatus]   = useState<PaymentStatus>((initialStatus as PaymentStatus) ?? 'pending');
  const [payment, setPayment] = useState<PaymentStatusData | null>(null);
  const [polling, setPolling] = useState(true);
  const pollCount             = useRef(0);

  useEffect(() => {
    if (!paymentId) { setPolling(false); return; }

    // If the redirect URL says failed/cancelled, skip polling
    if (initialStatus === 'failed' || initialStatus === 'cancelled') {
      setStatus(initialStatus as PaymentStatus);
      setPolling(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (pollCount.current >= MAX_POLLS) { setPolling(false); return; }
      pollCount.current += 1;

      const res = await api.get<PaymentStatusData>(`/payments/${paymentId}/status`);
      if (res.success) {
        setPayment(res.data);
        const serverStatus = res.data.status;
        if (serverStatus === 'completed' || serverStatus === 'failed' || serverStatus === 'cancelled') {
          setStatus(serverStatus);
          setPolling(false);
          if (serverStatus === 'completed') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          return;
        }
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => clearTimeout(timer);
  }, [paymentId, initialStatus]);

  const isSuccess   = status === 'completed';
  const isFailed    = status === 'failed';
  const isCancelled = status === 'cancelled';
  const isPending   = !isSuccess && !isFailed && !isCancelled;

  function handleClose() {
    if (payment?.orderId) {
      router.replace(`/order/${payment.orderId}` as any);
    } else {
      router.replace('/(tabs)/wallet' as any);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>

        {/* Icon */}
        <View style={[styles.iconWrap, isSuccess ? styles.iconSuccess : isFailed || isCancelled ? styles.iconError : styles.iconPending]}>
          {isPending ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <MaterialCommunityIcons
              name={isSuccess ? 'check-circle-outline' : 'close-circle-outline'}
              size={64}
              color={isSuccess ? Colors.success : Colors.error}
            />
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isPending   ? t('paymentProcessing')
          : isSuccess  ? t('paymentSuccess')
          : isCancelled ? t('paymentCancelled')
          :               t('paymentFailed')}
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {isPending    ? t('paymentProcessingMsg')
          : isSuccess   ? t('paymentSuccessMsg')
          : isCancelled ? t('paymentCancelledMsg')
          :               t('paymentFailedMsg')}
        </Text>

        {/* Amount badge */}
        {payment && (
          <View style={styles.amountBadge}>
            <Text style={styles.amountText}>
              {parseFloat(payment.amount).toLocaleString('ar-AE', { minimumFractionDigits: 2 })} {payment.currency}
            </Text>
          </View>
        )}

        {/* Polling indicator */}
        {isPending && polling && (
          <Text style={styles.pollingHint}>{t('paymentPollingHint')}</Text>
        )}

        {/* Actions — shown only when settled */}
        {!isPending && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleClose}>
              <Text style={styles.primaryBtnText}>
                {isSuccess ? t('goToWallet') : t('back')}
              </Text>
            </TouchableOpacity>

            {!isSuccess && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)/wallet' as any)}>
                <Text style={styles.secondaryBtnText}>{t('goToWallet')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  iconWrap: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  iconSuccess: { backgroundColor: '#F0FDF4' },
  iconError:   { backgroundColor: '#FFF1F2' },
  iconPending: { backgroundColor: '#EFF6FF' },

  title: { fontFamily: 'Cairo_800ExtraBold', fontSize: 24, color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontFamily: 'Cairo_400Regular', fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 24 },

  amountBadge: {
    backgroundColor: Colors.surface, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1.5, borderColor: Colors.border, marginBottom: 24,
  },
  amountText: { fontFamily: 'Cairo_700Bold', fontSize: 20, color: Colors.textPrimary, textAlign: 'center' },

  pollingHint: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 16 },

  actions: { width: '100%', gap: 12, marginTop: 8 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
  secondaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  secondaryBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: Colors.textPrimary },
});
