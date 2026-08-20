/**
 * Campaign Wizard — 9 steps for paid advertising campaigns.
 * Autosaves draft to AsyncStorage on every step.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { useLang } from '@/contexts/LangContext';
import { api } from '@/constants/api';
import {
  type PortalServiceResponse,
  normalizePortalService,
} from '@/constants/portalServices';

const DRAFT_KEY = 'portal_wizard_draft_v1';
const TOTAL_STEPS = 9;

interface WizardState {
  step: number;
  // Step 1: Platforms
  platforms: string[];
  // Step 2: Package
  packageId: number | null;
  packageName: string;
  packagePrice: string;
  // Step 3: Business info
  businessName: string;
  businessCategory: string;
  targetAudience: string;
  ageMin: string;
  ageMax: string;
  gender: 'all' | 'male' | 'female';
  campaignObjective: string;
  // Step 4: Platform details
  instagramHandle: string;
  facebookPageUrl: string;
  tiktokHandle: string;
  googleAdAccountId: string;
  snapchatHandle: string;
  // Step 5: Creative
  adHeadline: string;
  adText: string;
  adCta: string;
  landingPage: string;
  creativeUri: string;
  creativeType: 'image' | 'video' | '';
  // Step 6: WhatsApp
  waCountry: string;
  waNumber: string;
  // Step 7: Duration
  durationDays: number | null;
  startDate: string;
  endDate: string;
  // Step 8: Review (read-only)
  // Step 9: Payment
}

const DEFAULT_STATE: WizardState = {
  step: 1, platforms: [], packageId: null, packageName: '', packagePrice: '',
  businessName: '', businessCategory: '', targetAudience: '', ageMin: '18', ageMax: '45',
  gender: 'all', campaignObjective: 'obj_whatsapp',
  instagramHandle: '', facebookPageUrl: '', tiktokHandle: '', googleAdAccountId: '', snapchatHandle: '',
  adHeadline: '', adText: '', adCta: 'تواصل معنا', landingPage: '', creativeUri: '', creativeType: '',
  waCountry: '+971', waNumber: '', durationDays: 30, startDate: '', endDate: '',
};

interface Package { id: number; name: string; price: string; description: string | null; features: string[]; }

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'google', 'snapchat'];
const PLATFORM_ICONS: Record<string, string> = { instagram: 'instagram', facebook: 'facebook', tiktok: 'music-note', google: 'google', snapchat: 'snapchat' };
const OBJECTIVES = ['obj_whatsapp', 'obj_leads', 'obj_website', 'obj_sales', 'obj_calls', 'obj_brand'];
const CTA_OPTIONS = ['تواصل معنا', 'احجز الآن', 'تسوق الآن', 'تعرف أكثر', 'سجّل الآن', 'احصل على عرض'];

export default function WizardScreen() {
  const { t } = useLang();
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const [packages, setPackages] = useState<Package[]>([]);
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [vatRate, setVatRate] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  function set<K extends keyof WizardState>(key: K, val: WizardState[K]) {
    setState(s => ({ ...s, [key]: val }));
  }

  // Load draft + wallet + packages on mount
  useEffect(() => {
    (async () => {
      const [draft, wRes, sRes, stRes] = await Promise.all([
        AsyncStorage.getItem(DRAFT_KEY),
        api.get<{ balance: string }>('/wallet'),
        api.get<PortalServiceResponse[]>('/services?slug=advertising'),
        api.get<any>('/settings'),
      ]);
      if (wRes.success) setWalletBalance(wRes.data.balance);
      if (stRes.success) setVatRate(parseFloat(stRes.data?.vatRate ?? 0));

      // Load advertising packages
      if (sRes.success && sRes.data.length > 0) {
        const normalizedServices = sRes.data.map(normalizePortalService);
        const advSvc = normalizedServices.find(s => s.slug === 'advertising') ?? normalizedServices[0];
        setPackages(advSvc.packages ?? []);
      } else {
        // fallback: load from all services
        const allRes = await api.get<any[]>('/services');
        if (allRes.success) {
          const adv = allRes.data.map(normalizePortalService).find(s => s.slug === 'advertising');
          if (adv?.packages) setPackages(adv.packages);
        }
      }

      if (draft) {
        try {
          const parsed = JSON.parse(draft) as WizardState;
          setState(parsed);
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 3000);
        } catch {}
      }
    })();
  }, []);

  // Autosave draft
  const saveDraft = useCallback(async (s: WizardState) => {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(s)).catch(() => {});
  }, []);

  useEffect(() => { saveDraft(state); }, [state, saveDraft]);

  function goNext() {
    Haptics.selectionAsync();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setState(s => ({ ...s, step: Math.min(s.step + 1, TOTAL_STEPS) }));
  }

  function goBack() {
    if (state.step === 1) { router.back(); return; }
    Haptics.selectionAsync();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setState(s => ({ ...s, step: Math.max(s.step - 1, 1) }));
  }

  async function pickCreative() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), 'يرجى السماح بالوصول إلى مكتبة الصور');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      set('creativeUri', asset.uri);
      set('creativeType', asset.type === 'video' ? 'video' : 'image');
    }
  }

  const totalPrice = parseFloat(state.packagePrice || '0');
  const vatAmount = totalPrice * (vatRate / 100);
  const grandTotal = totalPrice + vatAmount;
  const balanceAfter = parseFloat(walletBalance) - grandTotal;

  async function submit() {
    if (grandTotal > parseFloat(walletBalance)) {
      Alert.alert(t('insufficientBalance'), t('insufficientBalanceMsg'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('addBalance'), onPress: () => router.push('/(tabs)/wallet' as any) },
      ]);
      return;
    }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 1. Create order
    const orderRes = await api.post<{ id: number; referenceCode: string }>('/orders', {
      packageId: state.packageId,
      notes: `حملة إعلانية: ${state.businessName}`,
    });

    if (!orderRes.success) {
      setSubmitting(false);
      Alert.alert(t('error'), (orderRes as any).error?.message ?? t('serverError'));
      return;
    }

    const orderId = orderRes.data.id;

    // 2. Save campaign data
    await api.post('/campaigns', {
      orderId,
      adPlatforms: state.platforms,
      campaignObjective: state.campaignObjective,
      targetAudience: state.targetAudience,
      ageRange: `${state.ageMin}-${state.ageMax}`,
      gender: state.gender,
      businessName: state.businessName,
      businessCategory: state.businessCategory,
      instagramHandle: state.instagramHandle || undefined,
      facebookPageUrl: state.facebookPageUrl || undefined,
      tiktokHandle: state.tiktokHandle || undefined,
      adHeadline: state.adHeadline,
      adPrimaryText: state.adText,
      adCallToAction: state.adCta,
      destinationUrl: state.landingPage || undefined,
      waCountry: state.waCountry,
      waNumber: state.waNumber,
      campaignDuration: state.durationDays,
      startDate: state.startDate || undefined,
      endDate: state.endDate || undefined,
    });

    // Clear draft
    await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});

    setSubmitting(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Alert.alert(t('orderCreated'), t('orderCreatedMsg'), [
      { text: t('goToOrders'), onPress: () => router.replace('/(tabs)/orders' as any) },
    ]);
  }

  // Validate step before proceeding
  function canGoNext(): boolean {
    switch (state.step) {
      case 1: return state.platforms.length > 0;
      case 2: return state.packageId !== null;
      case 3: return !!state.businessName.trim() && !!state.businessCategory.trim();
      case 5: return !!state.adHeadline.trim() && !!state.adText.trim();
      case 6: return !!state.waNumber.trim();
      case 7: return state.durationDays !== null;
      default: return true;
    }
  }

  const stepTitles: string[] = [
    t('selectPlatforms'), t('selectPackageStep'), t('businessInfoStep'),
    t('platformDetailsStep'), t('creativeStep'), t('whatsappStep'),
    t('durationStep'), t('reviewStep'), t('paymentStep'),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{t('step')} {state.step} {t('of')} {TOTAL_STEPS}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>{stepTitles[state.step - 1]}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(state.step / TOTAL_STEPS) * 100}%` }]} />
        </View>
      </View>

      {draftRestored && (
        <View style={styles.draftBanner}>
          <MaterialCommunityIcons name="content-save" size={16} color={Colors.success} />
          <Text style={styles.draftText}>{t('draftRestored')}</Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: Platform selection */}
          {state.step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepDesc}>{t('selectPlatformsDesc')}</Text>
              <View style={styles.platformGrid}>
                {PLATFORMS.map(pl => {
                  const selected = state.platforms.includes(pl);
                  return (
                    <TouchableOpacity
                      key={pl}
                      style={[styles.platformCard, selected && styles.platformCardActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        set('platforms', selected
                          ? state.platforms.filter(p => p !== pl)
                          : [...state.platforms, pl]);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={PLATFORM_ICONS[pl] as any}
                        size={32}
                        color={selected ? '#fff' : Colors.primary}
                      />
                      <Text style={[styles.platformName, selected && { color: '#fff' }]}>
                        {t(pl as any)}
                      </Text>
                      {selected && <View style={styles.checkBadge}>
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      </View>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 2: Package selection */}
          {state.step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepDesc}>اختر الباقة التي تناسب ميزانيتك</Text>
              {packages.length === 0
                ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
                : packages.filter(p => (p as any).isActive !== false).map((pkg, i) => {
                  const selected = state.packageId === pkg.id;
                  const tierBg = ['#F0FDF4', '#EFF6FF', '#FFF7ED'][i % 3];
                  const tierBorder = ['#86EFAC', '#93C5FD', '#FCA86F'][i % 3];
                  const tierColor = ['#15803D', '#1D4ED8', '#C2410C'][i % 3];
                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[styles.pkgOption, { borderColor: selected ? Colors.primary : tierBorder, backgroundColor: selected ? Colors.primary : tierBg }]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        set('packageId', pkg.id);
                        set('packageName', pkg.name);
                        set('packagePrice', pkg.price);
                      }}
                    >
                      <View style={styles.pkgOptionHeader}>
                        <Text style={[styles.pkgOptionPrice, { color: selected ? '#fff' : tierColor }]}>
                          {parseFloat(pkg.price).toLocaleString('ar-AE', { minimumFractionDigits: 0 })} {t('aed')}
                        </Text>
                        <Text style={[styles.pkgOptionName, { color: selected ? '#fff' : Colors.textPrimary }]}>{pkg.name}</Text>
                      </View>
                      {(pkg.features ?? []).slice(0, 4).map((f, fi) => (
                        <View key={fi} style={styles.pkgFeatureRow}>
                          <Text style={[styles.pkgFeatureText, { color: selected ? 'rgba(255,255,255,0.9)' : Colors.textSecondary }]}>{f}</Text>
                          <MaterialCommunityIcons name="check-circle" size={16} color={selected ? '#fff' : tierColor} />
                        </View>
                      ))}
                      {selected && (
                        <View style={styles.selectedCheck}>
                          <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
          )}

          {/* STEP 3: Business info */}
          {state.step === 3 && (
            <View style={styles.stepContent}>
              <WField label={t('businessName')} value={state.businessName} onChange={v => set('businessName', v)} placeholder="اسم شركتك أو نشاطك" />
              <WField label={t('businessCategory')} value={state.businessCategory} onChange={v => set('businessCategory', v)} placeholder="مثال: مطعم، عيادة، متجر" />
              <WField label={t('targetAudience')} value={state.targetAudience} onChange={v => set('targetAudience', v)} placeholder="وصف جمهورك المستهدف" multiline />
              <View style={styles.row}>
                <WField label={t('ageMax')} value={state.ageMax} onChange={(v: string) => set('ageMax', v)} placeholder="65" keyboard="numeric" flex />
                <View style={styles.rowSpacer} />
                <WField label={t('ageMin')} value={state.ageMin} onChange={(v: string) => set('ageMin', v)} placeholder="18" keyboard="numeric" flex />
              </View>
              <Text style={styles.fieldLabel}>{t('gender')}</Text>
              <View style={styles.segmented}>
                {(['all', 'female', 'male'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.segment, state.gender === g && styles.segmentActive]}
                    onPress={() => set('gender', g)}
                  >
                    <Text style={[styles.segmentText, state.gender === g && styles.segmentTextActive]}>
                      {t((`gender${g.charAt(0).toUpperCase()}${g.slice(1)}`) as any)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>{t('campaignObjective')}</Text>
              <View style={styles.objectiveGrid}>
                {OBJECTIVES.map(obj => (
                  <TouchableOpacity
                    key={obj}
                    style={[styles.objectiveBtn, state.campaignObjective === obj && styles.objectiveBtnActive]}
                    onPress={() => set('campaignObjective', obj)}
                  >
                    <Text style={[styles.objectiveBtnText, state.campaignObjective === obj && styles.objectiveBtnTextActive]}>
                      {t(obj as any)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 4: Platform details */}
          {state.step === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepDesc}>أدخل معلومات حساباتك على المنصات المختارة</Text>
              {state.platforms.includes('instagram') && <WField label="حساب إنستغرام @" value={state.instagramHandle} onChange={v => set('instagramHandle', v)} placeholder="@username" />}
              {state.platforms.includes('facebook') && <WField label="رابط صفحة فيسبوك" value={state.facebookPageUrl} onChange={v => set('facebookPageUrl', v)} placeholder="https://facebook.com/..." />}
              {state.platforms.includes('tiktok') && <WField label="حساب تيك توك @" value={state.tiktokHandle} onChange={v => set('tiktokHandle', v)} placeholder="@username" />}
              {state.platforms.includes('snapchat') && <WField label="حساب سناب شات @" value={state.snapchatHandle} onChange={v => set('snapchatHandle', v)} placeholder="@username" />}
              {state.platforms.includes('google') && <WField label="معرّف حساب جوجل أدز" value={state.googleAdAccountId} onChange={v => set('googleAdAccountId', v)} placeholder="XXX-XXX-XXXX" />}
              {state.platforms.length === 0 && <Text style={styles.noPlat}>لم تختر أي منصة</Text>}
            </View>
          )}

          {/* STEP 5: Creative */}
          {state.step === 5 && (
            <View style={styles.stepContent}>
              <WField label={t('adHeadline')} value={state.adHeadline} onChange={v => set('adHeadline', v)} placeholder="عنوان جذاب لإعلانك" />
              <WField label={t('adText')} value={state.adText} onChange={v => set('adText', v)} placeholder="النص الرئيسي للإعلان..." multiline />
              <Text style={styles.fieldLabel}>{t('adCta')}</Text>
              <View style={styles.ctaGrid}>
                {CTA_OPTIONS.map(cta => (
                  <TouchableOpacity
                    key={cta}
                    style={[styles.ctaBtn, state.adCta === cta && styles.ctaBtnActive]}
                    onPress={() => set('adCta', cta)}
                  >
                    <Text style={[styles.ctaBtnText, state.adCta === cta && styles.ctaBtnTextActive]}>{cta}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <WField label={t('landingPage')} value={state.landingPage} onChange={v => set('landingPage', v)} placeholder="https://..." keyboard="url" />
              <Text style={styles.fieldLabel}>{t('uploadCreative')}</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickCreative}>
                {state.creativeUri ? (
                  <Image source={{ uri: state.creativeUri }} style={styles.uploadPreview} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="cloud-upload-outline" size={36} color={Colors.primary} />
                    <Text style={styles.uploadText}>{t('uploadCreativeDesc')}</Text>
                  </>
                )}
              </TouchableOpacity>
              {state.creativeUri && (
                <TouchableOpacity onPress={() => { set('creativeUri', ''); set('creativeType', ''); }}>
                  <Text style={styles.removeCreative}>إزالة المحتوى</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* STEP 6: WhatsApp */}
          {state.step === 6 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepDesc}>أدخل رقم واتساب الأعمال الذي سيتواصل معه العملاء</Text>
              <View style={styles.row}>
                <WField label={t('waNumber')} value={state.waNumber} onChange={v => set('waNumber', v)} placeholder="50 000 0000" keyboard="phone-pad" flex />
                <View style={styles.rowSpacer} />
                <WField label={t('waCountry')} value={state.waCountry} onChange={v => set('waCountry', v)} placeholder="+971" keyboard="phone-pad" flex />
              </View>
              <Text style={styles.hint}>مثال: +971 50 000 0000</Text>
            </View>
          )}

          {/* STEP 7: Duration */}
          {state.step === 7 && (
            <View style={styles.stepContent}>
              <View style={styles.durationGrid}>
                {[7, 14, 30, null].map(d => {
                  const selected = d === null ? state.durationDays === null || (state.durationDays !== 7 && state.durationDays !== 14 && state.durationDays !== 30) : state.durationDays === d;
                  const label = d === null ? t('durationCustom') : d === 7 ? t('duration7') : d === 14 ? t('duration14') : t('duration30');
                  return (
                    <TouchableOpacity
                      key={String(d)}
                      style={[styles.durationBtn, selected && styles.durationBtnActive]}
                      onPress={() => set('durationDays', d ?? 1)}
                    >
                      <Text style={[styles.durationBtnText, selected && styles.durationBtnTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {(state.durationDays !== 7 && state.durationDays !== 14 && state.durationDays !== 30) && (
                <WField label="عدد الأيام" value={state.durationDays !== null ? String(state.durationDays) : ''} onChange={v => set('durationDays', parseInt(v) || null)} keyboard="numeric" />
              )}
              <WField label={t('startDate')} value={state.startDate} onChange={v => set('startDate', v)} placeholder="YYYY-MM-DD" />
              <WField label={t('endDate')} value={state.endDate} onChange={v => set('endDate', v)} placeholder="YYYY-MM-DD" />
            </View>
          )}

          {/* STEP 8: Review */}
          {state.step === 8 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepDesc}>مراجعة طلبك قبل الإرسال</Text>
              <ReviewSection title="المنصات">
                <Text style={styles.reviewValue}>{state.platforms.map(p => t(p as any)).join('، ')}</Text>
              </ReviewSection>
              <ReviewSection title="الباقة">
                <Text style={styles.reviewValue}>{state.packageName} — {state.packagePrice} {t('aed')}</Text>
              </ReviewSection>
              <ReviewSection title={t('businessName')}>
                <Text style={styles.reviewValue}>{state.businessName}</Text>
              </ReviewSection>
              <ReviewSection title={t('businessCategory')}>
                <Text style={styles.reviewValue}>{state.businessCategory}</Text>
              </ReviewSection>
              <ReviewSection title={t('gender')}>
                <Text style={styles.reviewValue}>{t((`gender${state.gender.charAt(0).toUpperCase()}${state.gender.slice(1)}`) as any)}</Text>
              </ReviewSection>
              <ReviewSection title={t('campaignObjective')}>
                <Text style={styles.reviewValue}>{t(state.campaignObjective as any)}</Text>
              </ReviewSection>
              <ReviewSection title={t('adHeadline')}>
                <Text style={styles.reviewValue}>{state.adHeadline}</Text>
              </ReviewSection>
              <ReviewSection title="واتساب">
                <Text style={styles.reviewValue}>{state.waCountry}{state.waNumber}</Text>
              </ReviewSection>
              <ReviewSection title="المدة">
                <Text style={styles.reviewValue}>{state.durationDays} {t('days')}</Text>
              </ReviewSection>
              {state.creativeUri && (
                <ReviewSection title={t('uploadCreative')}>
                  <Image source={{ uri: state.creativeUri }} style={styles.reviewThumb} />
                </ReviewSection>
              )}
            </View>
          )}

          {/* STEP 9: Payment */}
          {state.step === 9 && (
            <View style={styles.stepContent}>
              <View style={styles.payCard}>
                <PayRow label={t('subtotal')} value={`${totalPrice.toLocaleString('ar-AE', { minimumFractionDigits: 2 })} ${t('aed')}`} />
                {vatRate > 0 && <PayRow label={`${t('vat')} (${vatRate}%)`} value={`${vatAmount.toLocaleString('ar-AE', { minimumFractionDigits: 2 })} ${t('aed')}`} />}
                <View style={styles.payDivider} />
                <PayRow label={t('total')} value={`${grandTotal.toLocaleString('ar-AE', { minimumFractionDigits: 2 })} ${t('aed')}`} bold />
                <View style={styles.payDivider} />
                <PayRow label={t('currentBalance')} value={`${parseFloat(walletBalance).toLocaleString('ar-AE', { minimumFractionDigits: 2 })} ${t('aed')}`} />
                <PayRow
                  label={t('balanceAfter')}
                  value={`${balanceAfter.toLocaleString('ar-AE', { minimumFractionDigits: 2 })} ${t('aed')}`}
                  highlight={balanceAfter < 0}
                />
              </View>
              {balanceAfter < 0 && (
                <View style={styles.insufficientBox}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color={Colors.error} />
                  <Text style={styles.insufficientText}>{t('insufficientBalance')}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backNavBtn} onPress={goBack}>
          <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.textPrimary} />
          <Text style={styles.backNavText}>{t('back')}</Text>
        </TouchableOpacity>
        {state.step < TOTAL_STEPS ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canGoNext() && styles.nextBtnDisabled]}
            onPress={goNext}
            disabled={!canGoNext()}
          >
            <Text style={styles.nextBtnText}>{t('next')}</Text>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, (submitting || balanceAfter < 0) && styles.nextBtnDisabled]}
            onPress={submit}
            disabled={submitting || balanceAfter < 0}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.nextBtnText}>{t('confirm')}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// Sub-components
function WField({ label, value, onChange, placeholder, keyboard, multiline, flex }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboard?: any; multiline?: boolean; flex?: boolean;
}) {
  return (
    <View style={[styles.fieldWrap, flex && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboard ?? 'default'}
        multiline={multiline}
        textAlign="right"
        autoCapitalize="none"
      />
    </View>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.reviewSection}>
      <View style={styles.reviewRow}>
        {children}
        <Text style={styles.reviewLabel}>{title}</Text>
      </View>
    </View>
  );
}

function PayRow({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <View style={styles.payRow}>
      <Text style={[styles.payValue, bold && styles.payBold, highlight && { color: Colors.error }]}>{value}</Text>
      <Text style={[styles.payLabel, bold && styles.payBold]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  progressWrap: { backgroundColor: Colors.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stepTitle: { flex: 1, fontFamily: 'Cairo_700Bold', fontSize: 16, color: Colors.textPrimary, textAlign: 'right' },
  progressLabel: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textMuted, marginLeft: 'auto' },
  closeBtn: { padding: 4, marginHorizontal: 8 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  draftBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F0FDF4', paddingVertical: 6,
  },
  draftText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: Colors.success },
  scroll: { padding: 16, paddingBottom: 32 },
  stepContent: { gap: 16 },
  stepDesc: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'right', lineHeight: 22 },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  platformCard: {
    width: '30%', borderRadius: 16, padding: 14, alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.border,
    position: 'relative',
  },
  platformCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  platformName: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: Colors.textPrimary, marginTop: 6 },
  checkBadge: {
    position: 'absolute', top: 6, left: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  pkgOption: { borderRadius: 16, padding: 16, borderWidth: 2, marginBottom: 4, position: 'relative' },
  pkgOptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pkgOptionName: { fontFamily: 'Cairo_800ExtraBold', fontSize: 18, color: Colors.textPrimary },
  pkgOptionPrice: { fontFamily: 'Cairo_700Bold', fontSize: 20 },
  pkgFeatureRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginBottom: 4 },
  pkgFeatureText: { fontFamily: 'Cairo_400Regular', fontSize: 13, textAlign: 'right', flex: 1 },
  selectedCheck: { position: 'absolute', top: 12, left: 12 },
  fieldWrap: { marginBottom: 4 },
  fieldLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.textPrimary, textAlign: 'right', marginBottom: 8 },
  fieldInput: {
    backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.border, padding: 13, fontFamily: 'Cairo_400Regular',
    fontSize: 14, color: Colors.textPrimary, textAlign: 'right',
  },
  row: { flexDirection: 'row' },
  rowSpacer: { width: 10 },
  segmented: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.textMuted },
  segmentTextActive: { color: '#fff' },
  objectiveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  objectiveBtn: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
  },
  objectiveBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  objectiveBtnText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: Colors.textPrimary },
  objectiveBtnTextActive: { color: '#fff' },
  ctaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  ctaBtn: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
  },
  ctaBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  ctaBtnText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: Colors.textPrimary },
  ctaBtnTextActive: { color: '#fff' },
  uploadBtn: {
    height: 160, borderRadius: 16, borderWidth: 2, borderColor: Colors.border,
    borderStyle: 'dashed', backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  uploadPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  uploadText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted, marginTop: 8 },
  removeCreative: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: Colors.error, textAlign: 'center', marginTop: 8 },
  hint: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: Colors.textMuted, textAlign: 'right' },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durationBtn: {
    flex: 1, minWidth: '40%', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', backgroundColor: Colors.surface,
    borderWidth: 2, borderColor: Colors.border,
  },
  durationBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  durationBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: Colors.textPrimary },
  durationBtnTextActive: { color: '#fff' },
  noPlat: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  reviewSection: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewLabel: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textMuted },
  reviewValue: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  reviewThumb: { width: 80, height: 60, borderRadius: 8 },
  payCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  payLabel: { fontFamily: 'Cairo_400Regular', fontSize: 15, color: Colors.textSecondary },
  payValue: { fontFamily: 'Cairo_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  payBold: { fontFamily: 'Cairo_800ExtraBold', fontSize: 18, color: Colors.textPrimary },
  payDivider: { height: 1, backgroundColor: Colors.border },
  insufficientBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginTop: 12,
  },
  insufficientText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.error, flex: 1, textAlign: 'right' },
  navRow: {
    flexDirection: 'row', padding: 16, gap: 12,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface,
  },
  backNavBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
  },
  backNavText: { fontFamily: 'Cairo_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#fff' },
  submitBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.success, borderRadius: 14, paddingVertical: 14,
  },
});
