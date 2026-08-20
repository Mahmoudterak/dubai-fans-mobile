import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, TextInput,
  Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/constants/Colors';
import { useLang } from '@/contexts/LangContext';
import { api } from '@/constants/api';
import { BANK_TRANSFER } from '@/constants/config';

interface Wallet { balance: string; totalCredit: string; totalDebit: string; }
interface Tx {
  id: number; type: string; amount: string;
  balanceBefore: string; balanceAfter: string;
  description: string | null; createdAt: string;
}

const TOP_UP_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

export default function WalletScreen() {
  const { t } = useLang();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [sending, setSending] = useState(false);
  const [payMethod, setPayMethod] = useState<'bank_transfer' | 'ziina'>('bank_transfer');
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [wRes, tRes] = await Promise.all([
      api.get<Wallet & { transactions: Tx[] }>('/wallet'),
      api.get<Tx[]>('/wallet/transactions?limit=30'),
    ]);
    if (wRes.success) setWallet(wRes.data);
    if (tRes.success) setTxs(tRes.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  async function submitZiinaTopUp() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 50) {
      Alert.alert(t('error'), t('minTopupError'));
      return;
    }
    setSending(true);
    const res = await api.post<{ paymentId: number; checkoutUrl: string }>('/payments/ziina/create', {
      topupAmount: amt,
      currency: 'AED',
    });
    setSending(false);
    if (!res.success) {
      Alert.alert(t('error'), (res as any).error?.message ?? t('serverError'));
      return;
    }
    const { paymentId, checkoutUrl } = res.data;
    setShowTopUp(false);
    setAmount('');
    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, 'dubaifans://');
    const status = result.type === 'success'
      ? (new URL(result.url).searchParams.get('status') ?? 'pending')
      : 'cancelled';
    router.push({ pathname: '/payment-result', params: { status, paymentId: String(paymentId) } });
  }

  async function submitTopUp() {
    if (payMethod === 'ziina') { await submitZiinaTopUp(); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 50) {
      Alert.alert(t('error'), t('minTopupError'));
      return;
    }
    setSending(true);
    const res = await api.post('/wallet/topup', {
      amount: amt,
      paymentMethod: 'bank_transfer',
      reference: reference.trim() || undefined,
    });
    setSending(false);
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowTopUp(false);
      setAmount('');
      setReference('');
      Alert.alert(t('topUpSuccess'), t('topUpSuccessMsg'));
    } else {
      Alert.alert(t('error'), (res as any).error?.message ?? t('serverError'));
    }
  }

  async function copyBankValue(label: string, value: string) {
    try {
      await Clipboard.setStringAsync(value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopiedLabel(`تم نسخ ${label}`);
      setTimeout(() => setCopiedLabel(null), 2200);
    } catch {
      Alert.alert(t('error'), 'تعذّر نسخ البيانات. يمكنك نسخها يدوياً.');
    }
  }

  function TxRow({ tx }: { tx: Tx }) {
    const isCredit = ['credit', 'refund', 'adjustment_credit'].includes(tx.type) || parseFloat(tx.amount) > 0;
    return (
      <View style={styles.txRow}>
        <View style={styles.txLeft}>
          <Text style={styles.txDate}>
            {new Date(tx.createdAt).toLocaleDateString('ar-AE')}
          </Text>
          {tx.description && <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>}
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: isCredit ? Colors.success : Colors.error }]}>
            {isCredit ? '+' : '-'}{Math.abs(parseFloat(tx.amount)).toLocaleString('ar-AE', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.txBalance}>
            رصيد: {parseFloat(tx.balanceAfter).toLocaleString('ar-AE', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>{t('myWallet')}</Text>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('walletBalance')}</Text>
          <Text style={styles.balanceAmount}>
            {wallet ? parseFloat(wallet.balance).toLocaleString('ar-AE', { minimumFractionDigits: 2 }) : '—'}
          </Text>
          <Text style={styles.balanceCurrency}>{t('aed')}</Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>إجمالي الإيداع</Text>
              <Text style={styles.balanceStatVal}>
                {wallet ? parseFloat(wallet.totalCredit).toLocaleString('ar-AE', { minimumFractionDigits: 2 }) : '—'}
              </Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>إجمالي السحب</Text>
              <Text style={styles.balanceStatVal}>
                {wallet ? parseFloat(wallet.totalDebit).toLocaleString('ar-AE', { minimumFractionDigits: 2 }) : '—'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.topUpBtn} onPress={() => setShowTopUp(true)}>
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.topUpBtnText}>{t('topUp')}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick amounts */}
        <Text style={styles.sectionTitle}>شحن سريع</Text>
        <View style={styles.amountsRow}>
          {TOP_UP_AMOUNTS.slice(0, 3).map(a => (
            <TouchableOpacity key={a} style={styles.amountChip} onPress={() => { setAmount(String(a)); setShowTopUp(true); }}>
              <Text style={styles.amountChipText}>{a} {t('aed')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.amountsRow}>
          {TOP_UP_AMOUNTS.slice(3).map(a => (
            <TouchableOpacity key={a} style={styles.amountChip} onPress={() => { setAmount(String(a)); setShowTopUp(true); }}>
              <Text style={styles.amountChipText}>{a} {t('aed')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>{t('transactionHistory')}</Text>
        {txs.length === 0 ? (
          <View style={styles.emptyTx}>
            <MaterialCommunityIcons name="swap-horizontal" size={48} color={Colors.border} />
            <Text style={styles.emptyTxText}>{t('noTransactions')}</Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {txs.map((tx, i) => <TxRow key={tx.id} tx={tx} />)}
          </View>
        )}
      </ScrollView>

      {/* Top-up modal */}
      <Modal visible={showTopUp} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTopUp(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTopUp(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('topUp')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Payment method selector */}
              <Text style={styles.fieldLabel}>{t('topUpMethod')}</Text>
              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[styles.methodBtn, payMethod === 'bank_transfer' && styles.methodBtnActive]}
                  onPress={() => setPayMethod('bank_transfer')}
                >
                  <MaterialCommunityIcons name="bank-outline" size={18} color={payMethod === 'bank_transfer' ? '#fff' : Colors.textPrimary} />
                  <Text style={[styles.methodBtnText, payMethod === 'bank_transfer' && styles.methodBtnTextActive]}>{t('bankTransfer')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodBtn, payMethod === 'ziina' && styles.methodBtnActive]}
                  onPress={() => setPayMethod('ziina')}
                >
                  <MaterialCommunityIcons name="credit-card-outline" size={18} color={payMethod === 'ziina' ? '#fff' : Colors.textPrimary} />
                  <Text style={[styles.methodBtnText, payMethod === 'ziina' && styles.methodBtnTextActive]}>{t('payViaZiina')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>{t('topUpAmount')} (درهم)</Text>
              <TextInput
                style={styles.fieldInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="أدخل المبلغ"
                placeholderTextColor={Colors.textMuted}
                textAlign="right"
              />

              {/* Quick select */}
              <View style={styles.quickAmounts}>
                {TOP_UP_AMOUNTS.map(a => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.quickAmt, amount === String(a) && styles.quickAmtActive]}
                    onPress={() => setAmount(String(a))}
                  >
                    <Text style={[styles.quickAmtText, amount === String(a) && styles.quickAmtTextActive]}>
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {payMethod === 'bank_transfer' && (
                <>
                   <View style={styles.bankCard}>
                     <View style={styles.bankCardHeader}>
                       <MaterialCommunityIcons name="bank-outline" size={20} color={Colors.primary} />
                       <Text style={styles.bankCardTitle}>بيانات التحويل البنكي</Text>
                     </View>
                     <BankDetail label="اسم الحساب" value={BANK_TRANSFER.accountName} />
                     <BankDetail label="البنك" value={BANK_TRANSFER.bank} />
                     <BankDetail label="عنوان الفرع" value={BANK_TRANSFER.branchAddress} />
                     <BankDetail label="IBAN" value={BANK_TRANSFER.iban} copyable onCopy={copyBankValue} />
                     <BankDetail label="رقم الحساب" value={BANK_TRANSFER.accountNumber} copyable onCopy={copyBankValue} />
                     <BankDetail label="SWIFT" value={BANK_TRANSFER.swift} copyable onCopy={copyBankValue} />
                   </View>
                  <Text style={styles.fieldLabel}>{t('referenceNumber')} (اختياري)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={reference}
                    onChangeText={setReference}
                    placeholder="رقم المعاملة / المرجع"
                    placeholderTextColor={Colors.textMuted}
                    textAlign="right"
                  />
                </>
              )}

               {copiedLabel && (
                 <View style={styles.copyToast}>
                   <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
                   <Text style={styles.copyToastText}>{copiedLabel}</Text>
                 </View>
               )}

              <View style={styles.noteBox}>
                <MaterialCommunityIcons name="information-outline" size={18} color={Colors.info} />
                <Text style={styles.noteText}>
                  {payMethod === 'ziina' ? t('topUpNoteZiina') : t('topUpNote')}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, sending && styles.btnDisabled]}
                onPress={submitTopUp}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>{payMethod === 'ziina' ? t('payViaZiina') : 'إرسال طلب الشحن'}</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function BankDetail({ label, value, copyable, onCopy }: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: (label: string, value: string) => void;
}) {
  return (
    <View style={styles.bankDetailRow}>
      <View style={styles.bankDetailActions}>
        {copyable && (
          <TouchableOpacity
            accessibilityLabel={`نسخ ${label}`}
            style={styles.copyButton}
            onPress={() => onCopy?.(label, value)}
          >
            <MaterialCommunityIcons name="content-copy" size={16} color={Colors.primary} />
            <Text style={styles.copyButtonText}>نسخ</Text>
          </TouchableOpacity>
        )}
        <Text selectable style={styles.bankDetailValue}>{value}</Text>
      </View>
      <Text style={styles.bankDetailLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 44 },
  screenTitle: { fontFamily: 'Cairo_800ExtraBold', fontSize: 23, color: Colors.textPrimary, textAlign: 'right', marginBottom: 17 },

  balanceCard: {
    backgroundColor: Colors.primary, borderRadius: 22, padding: 24,
    alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 17, elevation: 10,
    marginBottom: 26,
  },
  balanceLabel: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  balanceAmount: { fontFamily: 'Cairo_800ExtraBold', fontSize: 48, color: '#fff', lineHeight: 56 },
  balanceCurrency: { fontFamily: 'Cairo_400Regular', fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 20 },
  balanceRow: { flexDirection: 'row', width: '100%', marginBottom: 20 },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatLabel: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  balanceStatVal: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff', marginTop: 2 },
  balanceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  topUpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 50,
    paddingHorizontal: 32, paddingVertical: 12,
  },
  topUpBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },

  sectionTitle: { fontFamily: 'Cairo_700Bold', fontSize: 17, color: Colors.textPrimary, textAlign: 'right', marginBottom: 13, marginTop: 2 },
  amountsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  amountChip: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  amountChipText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: Colors.textPrimary },

  txList: {
    backgroundColor: Colors.surface, borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#171827', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055, shadowRadius: 11, elevation: 3,
    marginTop: 4,
  },
  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  txLeft: { flex: 1 },
  txRight: { alignItems: 'flex-end' },
  txDate: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: Colors.textMuted },
  txDesc: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textPrimary, marginTop: 2, textAlign: 'right' },
  txAmount: { fontFamily: 'Cairo_700Bold', fontSize: 16 },
  txBalance: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  emptyTx: { alignItems: 'center', paddingVertical: 46, backgroundColor: Colors.surface, borderRadius: 18 },
  emptyTxText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted, marginTop: 12 },

  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  modalTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: Colors.textPrimary },
  modalContent: { padding: 20, paddingBottom: 40 },
  fieldLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.textPrimary, textAlign: 'right', marginBottom: 8 },
  fieldInput: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, padding: 14,
    fontFamily: 'Cairo_400Regular', fontSize: 15, color: Colors.textPrimary,
    marginBottom: 20,
  },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  quickAmt: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  quickAmtActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickAmtText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.textPrimary },
  quickAmtTextActive: { color: '#fff' },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  methodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  methodBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  methodBtnText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: Colors.textPrimary },
  methodBtnTextActive: { color: '#fff' },
  bankCard: {
    backgroundColor: '#FFF4F4', borderRadius: 16, borderWidth: 1, borderColor: '#F5D1D3',
    padding: 14, marginBottom: 20,
  },
  bankCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },
  bankCardTitle: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: Colors.textPrimary, textAlign: 'right' },
  bankDetailRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F7E4E4', gap: 12,
  },
  bankDetailActions: { flex: 1, alignItems: 'flex-start', gap: 6 },
  bankDetailLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: Colors.textSecondary, textAlign: 'right' },
  bankDetailValue: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: Colors.textPrimary, textAlign: 'left' },
  copyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F4C5C6', paddingHorizontal: 8, paddingVertical: 4,
  },
  copyButtonText: { fontFamily: 'Cairo_600SemiBold', fontSize: 11, color: Colors.primary },
  copyToast: {
    flexDirection: 'row-reverse', alignItems: 'center', alignSelf: 'center', gap: 7,
    backgroundColor: '#1F6A42', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, marginTop: 2, marginBottom: 12,
  },
  copyToastText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: '#fff' },
  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 24,
  },
  noteText: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.info, flex: 1, textAlign: 'right', lineHeight: 20 },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  submitBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
  btnDisabled: { opacity: 0.7 },
});
