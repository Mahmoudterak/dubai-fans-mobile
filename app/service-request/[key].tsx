import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { api } from '@/constants/api';
import {
  type MobilePackage,
  type MobileService,
  type PortalServiceResponse,
  normalizePortalService,
} from '@/constants/portalServices';
import {
  getServiceRequestCard,
  isServiceRequestKey,
  type ServiceRequestKey,
} from '@/constants/serviceCatalog';

type FormState = Record<string, string>;
type RequestStep = 1 | 2 | 3;

interface CreatedOrder {
  orderId: number;
  total: number;
  balance: number;
}

const CAMPAIGN_PLATFORMS = [
  { key: 'tiktok', label: 'TikTok', icon: 'music-note' },
  { key: 'facebook', label: 'Facebook', icon: 'facebook' },
  { key: 'instagram', label: 'Instagram', icon: 'instagram' },
  { key: 'google', label: 'Google', icon: 'google' },
  { key: 'snapchat', label: 'سناب شات', icon: 'snapchat' },
];

const CAMPAIGN_OBJECTIVES = ['زيارات الموقع', 'رسائل واتساب', 'عملاء محتملون', 'مبيعات', 'وعي بالعلامة التجارية'];

function getCampaignPlatformLimit(pkg: MobilePackage | null): number {
  if (!pkg) return 0;
  const price = Number(pkg.price);
  if (price === 499) return 2;
  if (price === 999) return 3;
  if (price === 1999) return 4;
  return 0;
}

function getCampaignDurationDays(pkg: MobilePackage | null): number | null {
  if (!pkg) return null;
  const price = Number(pkg.price);
  if (price === 499) return 7;
  if (price === 999) return 15;
  if (price === 1999) return 30;
  return null;
}

export default function ServiceRequestScreen() {
  const params = useLocalSearchParams<{ key?: string | string[] }>();
  const paramKey = Array.isArray(params.key) ? params.key[0] : params.key;
  const requestKey: ServiceRequestKey | null = paramKey && isServiceRequestKey(paramKey) ? paramKey : null;

  const [services, setServices] = useState<MobileService[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [campaignPlatforms, setCampaignPlatforms] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [step, setStep] = useState<RequestStep>(1);
  const [draftReady, setDraftReady] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const draftKey = requestKey ? `dubai-fans:service-request-draft:${requestKey}` : null;

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const response = await api.get<PortalServiceResponse[]>('/services');
    if (response.success) {
      setServices(response.data.map(normalizePortalService).filter((service) => service.isActive));
    } else {
      setLoadError(response.error.message ?? 'تعذّر تحميل الخدمات. تحقق من الاتصال ثم حاول مجدداً.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  useEffect(() => {
    let active = true;
    setDraftReady(false);
    setRestoredDraft(false);
    setStep(1);

    if (!draftKey) return () => { active = false; };

    AsyncStorage.getItem(draftKey)
      .then((value) => {
        if (!active || !value) return;
        const saved = JSON.parse(value) as {
          selectedPackageId?: number | null;
          campaignPlatforms?: string[];
          form?: FormState;
          step?: RequestStep;
        };
        setSelectedPackageId(saved.selectedPackageId ?? null);
        setCampaignPlatforms(Array.isArray(saved.campaignPlatforms) ? saved.campaignPlatforms : []);
        setForm(saved.form ?? {});
        setStep(saved.step && saved.step >= 1 && saved.step <= 3 ? saved.step : 1);
        setRestoredDraft(true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setDraftReady(true);
      });

    return () => { active = false; };
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady || !draftKey || createdOrder) return;
    AsyncStorage.setItem(draftKey, JSON.stringify({
      selectedPackageId,
      campaignPlatforms,
      form,
      step,
    })).catch(() => undefined);
  }, [campaignPlatforms, createdOrder, draftKey, draftReady, form, selectedPackageId, step]);

  const card = useMemo(
    () => requestKey ? getServiceRequestCard(services, requestKey) : null,
    [requestKey, services],
  );

  const selectedService = useMemo(() => {
    if (!card || !requestKey) return null;
    return card.services[0] ?? null;
  }, [card, requestKey]);

  const packages = useMemo(
    () => (selectedService?.packages ?? []).filter((pkg) => pkg.isActive),
    [selectedService],
  );
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId) ?? null;
  const campaignPlatformLimit = requestKey === 'advertising' ? getCampaignPlatformLimit(selectedPackage) : 0;
  const availableCampaignPlatforms = campaignPlatformLimit === 4
    ? CAMPAIGN_PLATFORMS
    : CAMPAIGN_PLATFORMS.filter((platform) => platform.key !== 'snapchat');

  function setValue(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCampaignPlatform(platform: string) {
    if (!campaignPlatforms.includes(platform) && campaignPlatforms.length >= getCampaignPlatformLimit(selectedPackage)) {
      Alert.alert('عدد المنصات مكتمل', `يمكنك اختيار ${getCampaignPlatformLimit(selectedPackage)} منصات فقط مع الباقة المختارة.`);
      return;
    }
    setCampaignPlatforms((current) => (
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    ));
  }

  function selectPackage(id: number) {
    setSelectedPackageId(id);
    if (requestKey === 'advertising') setCampaignPlatforms([]);
  }

  function missing(message: string): boolean {
    Alert.alert('بيانات مطلوبة', message);
    return true;
  }

  function validateDetails(): boolean {
    if (!selectedService) return !missing('نوع الخدمة غير متاح حالياً في الكتالوج.');

    if (requestKey === 'advertising') {
      const limit = getCampaignPlatformLimit(selectedPackage);
      if (limit === 0) return !missing('تعذّر تحديد عدد المنصات المسموح بها لهذه الباقة.');
      if (campaignPlatforms.length !== limit) return !missing(`اختر ${limit} منصات بالضبط لهذه الباقة.`);
      if (!form.businessName?.trim()) return !missing('أدخل اسم النشاط التجاري.');
      if (!form.businessCategory?.trim()) return !missing('أدخل نوع النشاط التجاري.');
      if (!form.country?.trim() || !form.city?.trim()) return !missing('أدخل الدولة والمدينة.');
      if (!form.whatsappNumber?.trim()) return !missing('أدخل رقم واتساب للتواصل.');
      if (!form.campaignObjective?.trim()) return !missing('اختر هدف الحملة.');
    }

    if (requestKey === 'social-growth') {
      if (!form.accountLink?.trim()) return !missing('أدخل رابط أو اسم حساب السوشيال ميديا.');
      if (!form.socialRequest?.trim()) return !missing('اكتب تفاصيل طلبك.');
    }

    if (requestKey === 'website' || requestKey === 'ecommerce') {
      if (!selectedService) return !missing('نوع المشروع غير متاح حالياً في الكتالوج.');
      if (!form.businessName?.trim()) return !missing('أدخل اسم الشركة أو النشاط.');
      if (!form.businessCategory?.trim()) return !missing('أدخل نوع النشاط التجاري.');
      if (!form.projectDescription?.trim()) return !missing('اكتب وصف المشروع والمتطلبات.');
    }

    if (requestKey === 'seo') {
      if (!form.websiteUrl?.trim()) return !missing('أدخل رابط الموقع الإلكتروني.');
      if (!form.country?.trim() || !form.city?.trim()) return !missing('أدخل الدولة والمدينة.');
      if (!form.businessCategory?.trim()) return !missing('أدخل نوع النشاط التجاري.');
      if (!form.seoGoals?.trim()) return !missing('اكتب أهداف SEO أو الكلمات المستهدفة.');
    }

    return true;
  }

  function moveToNextStep() {
    setSubmitError('');
    if (step === 1) {
      if (!selectedService || !selectedPackage) {
        missing('اختر باقة متاحة أولاً.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2 && validateDetails()) setStep(3);
  }

  function buildOrderRequest() {
    if (!requestKey || !selectedPackage) return null;

    if (requestKey === 'advertising') {
      return {
        packageId: selectedPackage.id,
        notes: `إدارة حملة إعلانية — ${form.businessName?.trim() ?? ''}`.trim(),
        serviceData: {
          requestType: 'campaign_management',
          platforms: campaignPlatforms,
          businessName: form.businessName?.trim(),
          businessCategory: form.businessCategory?.trim(),
          country: form.country?.trim(),
          city: form.city?.trim(),
          whatsappNumber: form.whatsappNumber?.trim(),
          websiteUrl: form.websiteUrl?.trim() || undefined,
          campaignObjective: form.campaignObjective?.trim(),
          budgetRange: form.budgetRange?.trim() || undefined,
          platformLimit: getCampaignPlatformLimit(selectedPackage),
          durationDays: getCampaignDurationDays(selectedPackage),
          additionalNotes: form.additionalNotes?.trim() || undefined,
        },
      };
    }

    if (requestKey === 'social-growth') {
      return {
        packageId: selectedPackage.id,
        notes: `طلب سوشيال ميديا — ${form.accountLink?.trim() ?? ''}`.trim(),
        serviceData: {
          requestType: 'social_service',
          accountLink: form.accountLink?.trim(),
          requestDetails: form.socialRequest?.trim(),
          additionalNotes: form.additionalNotes?.trim() || undefined,
        },
      };
    }

    if (requestKey === 'website' || requestKey === 'ecommerce') {
      const projectType = requestKey === 'ecommerce' ? 'store' : 'website';
      return {
        packageId: selectedPackage.id,
        notes: `مشروع ${projectType === 'store' ? 'متجر إلكتروني' : 'موقع إلكتروني'} — ${form.businessName?.trim() ?? ''}`.trim(),
        serviceData: {
          requestType: 'website_or_store',
          projectType,
          businessName: form.businessName?.trim(),
          businessCategory: form.businessCategory?.trim(),
          projectDescription: form.projectDescription?.trim(),
          websiteUrl: form.websiteUrl?.trim() || undefined,
          needsDomain: form.needsDomain === 'yes',
          needsHosting: form.needsHosting === 'yes',
          productCount: projectType === 'store' ? form.productCount?.trim() || undefined : undefined,
          storeFeatures: projectType === 'store' ? form.storeFeatures?.trim() || undefined : undefined,
          additionalNotes: form.additionalNotes?.trim() || undefined,
        },
      };
    }

    return {
      packageId: selectedPackage.id,
      notes: `طلب Google SEO — ${form.websiteUrl?.trim() ?? ''}`.trim(),
      serviceData: {
        requestType: 'google_seo',
        websiteUrl: form.websiteUrl?.trim(),
        country: form.country?.trim(),
        city: form.city?.trim(),
        businessCategory: form.businessCategory?.trim(),
        seoGoals: form.seoGoals?.trim(),
        targetKeywords: form.targetKeywords?.trim() || undefined,
        competitorUrls: form.competitorUrls?.trim() || undefined,
        additionalNotes: form.additionalNotes?.trim() || undefined,
      },
    };
  }

  function confirmSubmit() {
    if (!validateDetails() || !selectedPackage || submitting) return;
    Alert.alert(
      'مراجعة وتأكيد الطلب',
      `الباقة: ${selectedPackage.name}\nالإجمالي يُحتسب من الخادم وفق الباقة والضريبة. سيتم خصمه من المحفظة عند تأكيد إنشاء الطلب.`,
      [
        { text: 'رجوع', style: 'cancel' },
        { text: 'تأكيد إنشاء الطلب', onPress: createOrder },
      ],
    );
  }

  async function createOrder() {
    const payload = buildOrderRequest();
    if (!payload || submitting) return;

    setSubmitting(true);
    setSubmitError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const response = await api.post<CreatedOrder>('/orders', payload);
    setSubmitting(false);

    if (response.success && Number.isInteger(response.data.orderId) && response.data.orderId > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (draftKey) AsyncStorage.removeItem(draftKey).catch(() => undefined);
      setCreatedOrder(response.data);
      return;
    }

    setSubmitError(
      response.success
        ? 'تعذّر تأكيد رقم الطلب من الخادم. لم يتم عرض نجاح للطلب.'
        : response.error.message ?? 'تعذّر إنشاء الطلب. حاول مجدداً.',
    );
  }

  if (!requestKey) {
    return <Fallback title="الخدمة غير متاحة" message="رابط الخدمة غير صحيح." onRetry={() => router.replace('/(tabs)/request' as any)} />;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (loadError || !card || !card.isAvailable) {
    const message = loadError || !card
      ? loadError || 'لا توجد خدمة فعالة مطابقة في الكتالوج.'
      : 'هذه الخدمة غير متاحة حالياً. جرّب خدمة أخرى أو أعد المحاولة لاحقاً.';
    return <Fallback title="تعذّر تحميل الخدمة" message={message} onRetry={loadCatalog} />;
  }

  if (createdOrder) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><MaterialCommunityIcons name="check" size={42} color="#fff" /></View>
          <Text style={styles.successTitle}>تم إنشاء طلبك</Text>
           <Text style={styles.successBody}>تم تأكيد الطلب وربطه بحسابك. ستجد التحديثات والملفات في صفحة التتبع.</Text>
          <Text style={styles.orderNumber}>طلب رقم #{createdOrder.orderId}</Text>
           <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace({ pathname: '/order/[id]', params: { id: String(createdOrder.orderId) } } as any)}>
             <Text style={styles.primaryButtonText}>تتبّع الطلب الآن</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/(tabs)/request' as any)}>
            <Text style={styles.secondaryButtonText}>طلب خدمة أخرى</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{card.title}</Text>
            <Text style={styles.subtitle}>{card.description}</Text>
          </View>
        </View>

         <ProgressSteps currentStep={step} />

         <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
           {restoredDraft && (
             <Notice text="استعدنا مسودة طلبك المحفوظة على هذا الجهاز. يمكنك تعديلها قبل الإرسال." />
           )}
            {step === 1 && card.features.length > 0 && (
              <Section title="ما تتضمنه الخدمة">
                <Text style={styles.serviceHighlights}>{card.features.join(' • ')}</Text>
              </Section>
            )}
           {step === 1 && <Section title="اختر الباقة">
            {selectedService ? (
               <PackagePicker
                 packages={packages}
                 selectedId={selectedPackageId}
                 recommendedId={card.recommendedPackageId}
                  onSelect={selectPackage}
               />
            ) : (
              <Notice text="لا توجد باقات فعالة متاحة لهذا النوع من المشروع." />
            )}
           </Section>}

           {step === 2 && requestKey === 'advertising' && (
            <>
              <Section title="المنصات الإعلانية">
                 <Notice text={campaignPlatformLimit ? `اختر ${campaignPlatformLimit} منصات بالضبط لهذه الباقة.` : 'ارجع واختر باقة الحملة أولاً.'} />
                <View style={styles.optionGrid}>
                   {availableCampaignPlatforms.map((platform) => (
                    <TouchableOpacity
                      key={platform.key}
                      style={[styles.platformChip, campaignPlatforms.includes(platform.key) && styles.optionSelected]}
                      onPress={() => toggleCampaignPlatform(platform.key)}
                    >
                      <MaterialCommunityIcons name={platform.icon as any} size={19} color={campaignPlatforms.includes(platform.key) ? '#fff' : Colors.primary} />
                      <Text style={[styles.optionText, campaignPlatforms.includes(platform.key) && styles.optionTextSelected]}>{platform.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Section>
              <Section title="بيانات النشاط والحملة">
                <Field label="اسم النشاط التجاري *" value={form.businessName} onChangeText={(value) => setValue('businessName', value)} />
                <Field label="نوع النشاط التجاري *" value={form.businessCategory} onChangeText={(value) => setValue('businessCategory', value)} />
                <Field label="الدولة *" value={form.country} onChangeText={(value) => setValue('country', value)} />
                <Field label="المدينة *" value={form.city} onChangeText={(value) => setValue('city', value)} />
                <Field label="رقم واتساب للتواصل *" value={form.whatsappNumber} onChangeText={(value) => setValue('whatsappNumber', value)} keyboardType="phone-pad" />
                <Field label="رابط الموقع أو Landing Page (اختياري)" value={form.websiteUrl} onChangeText={(value) => setValue('websiteUrl', value)} keyboardType="url" />
                <Text style={styles.fieldLabel}>هدف الحملة *</Text>
                <OptionChips options={CAMPAIGN_OBJECTIVES.map((label) => ({ key: label, label }))} selected={form.campaignObjective ?? ''} onSelect={(value) => setValue('campaignObjective', value)} />
                <Field label="الميزانية المتوقعة (اختياري)" value={form.budgetRange} onChangeText={(value) => setValue('budgetRange', value)} />
                 {selectedPackage && (
                   <Notice text={`مدة هذه الباقة ${getCampaignDurationDays(selectedPackage) ?? '—'} يوم، وفق الباقة المختارة.`} />
                 )}
              </Section>
            </>
          )}

           {step === 2 && requestKey === 'social-growth' && (
            <>
              <Notice text="تُعرض أدناه الباقات والميزات التي يعلنها الكتالوج الحالي فقط. لا يعلن الكتالوج منصات أو كميات أو أنواع نمو مستقلة، لذلك لا تظهر خيارات غير مدعومة." />
              <Section title="بيانات الحساب">
                <Field label="رابط أو اسم الحساب *" value={form.accountLink} onChangeText={(value) => setValue('accountLink', value)} autoCapitalize="none" />
                <Field label="تفاصيل طلبك *" value={form.socialRequest} onChangeText={(value) => setValue('socialRequest', value)} multiline placeholder="اكتب ما تحتاجه ضمن نطاق الباقة المختارة" />
              </Section>
            </>
          )}

           {step === 2 && (requestKey === 'website' || requestKey === 'ecommerce') && (
            <Section title="تفاصيل المشروع">
              <Field label="اسم الشركة أو النشاط *" value={form.businessName} onChangeText={(value) => setValue('businessName', value)} />
              <Field label="نوع النشاط التجاري *" value={form.businessCategory} onChangeText={(value) => setValue('businessCategory', value)} />
              <Field label="وصف المشروع والمتطلبات *" value={form.projectDescription} onChangeText={(value) => setValue('projectDescription', value)} multiline />
              <Field label="الموقع الحالي (اختياري)" value={form.websiteUrl} onChangeText={(value) => setValue('websiteUrl', value)} keyboardType="url" />
              <Text style={styles.fieldLabel}>هل تحتاج نطاقاً؟</Text>
              <OptionChips options={[{ key: 'yes', label: 'نعم' }, { key: 'no', label: 'لا' }]} selected={form.needsDomain ?? ''} onSelect={(value) => setValue('needsDomain', value)} />
              <Text style={styles.fieldLabel}>هل تحتاج استضافة؟</Text>
              <OptionChips options={[{ key: 'yes', label: 'نعم' }, { key: 'no', label: 'لا' }]} selected={form.needsHosting ?? ''} onSelect={(value) => setValue('needsHosting', value)} />
               {requestKey === 'ecommerce' && (
                <>
                  <Field label="عدد المنتجات التقريبي (اختياري)" value={form.productCount} onChangeText={(value) => setValue('productCount', value)} keyboardType="number-pad" />
                  <Field label="خصائص المتجر المطلوبة (اختياري)" value={form.storeFeatures} onChangeText={(value) => setValue('storeFeatures', value)} multiline />
                </>
              )}
            </Section>
          )}

           {step === 2 && requestKey === 'seo' && (
            <Section title="تفاصيل SEO">
              <Field label="رابط الموقع الإلكتروني *" value={form.websiteUrl} onChangeText={(value) => setValue('websiteUrl', value)} keyboardType="url" autoCapitalize="none" />
              <Field label="الدولة *" value={form.country} onChangeText={(value) => setValue('country', value)} />
              <Field label="المدينة *" value={form.city} onChangeText={(value) => setValue('city', value)} />
              <Field label="نوع النشاط التجاري *" value={form.businessCategory} onChangeText={(value) => setValue('businessCategory', value)} />
              <Field label="أهداف SEO أو المجالات المستهدفة *" value={form.seoGoals} onChangeText={(value) => setValue('seoGoals', value)} multiline />
              <Field label="الكلمات المستهدفة (اختياري)" value={form.targetKeywords} onChangeText={(value) => setValue('targetKeywords', value)} multiline />
              <Field label="روابط المنافسين (اختياري)" value={form.competitorUrls} onChangeText={(value) => setValue('competitorUrls', value)} multiline />
            </Section>
          )}

           {step === 2 && <Section title="ملاحظات إضافية">
            <Field label="أي تفاصيل أخرى (اختياري)" value={form.additionalNotes} onChangeText={(value) => setValue('additionalNotes', value)} multiline />
           </Section>}

           {step === 3 && selectedPackage && (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>مراجعة الطلب</Text>
              <Text style={styles.reviewText}>الخدمة: {card.title}</Text>
              <Text style={styles.reviewText}>الباقة: {selectedPackage.name}</Text>
              <Text style={styles.reviewText}>السعر: {formatPrice(selectedPackage.price)} درهم{selectedPackage.billingCycle === 'monthly' ? ' / شهر' : ''}</Text>
              <Text style={styles.reviewHint}>سيؤكد الخادم السعر والضريبة والرصيد قبل إنشاء الطلب.</Text>
            </View>
          )}

          {submitError ? <Notice text={submitError} error /> : null}
        </ScrollView>
         <View style={styles.stickyFooter}>
           {step > 1 && (
             <TouchableOpacity style={styles.backStepButton} onPress={() => setStep((current) => (current - 1) as RequestStep)}>
               <Text style={styles.backStepText}>رجوع</Text>
             </TouchableOpacity>
           )}
           <TouchableOpacity
             style={[styles.primaryButton, styles.footerPrimary, (step === 3 && submitting) && styles.buttonDisabled]}
             disabled={step === 3 && submitting}
             onPress={step === 3 ? confirmSubmit : moveToNextStep}
           >
             {submitting
               ? <ActivityIndicator color="#fff" />
               : <Text style={styles.primaryButtonText}>{step === 1 ? 'التالي: بيانات النشاط' : step === 2 ? 'التالي: مراجعة الطلب' : 'تأكيد إنشاء الطلب'}</Text>}
           </TouchableOpacity>
         </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PackagePicker({ packages, selectedId, recommendedId, onSelect }: {
  packages: MobilePackage[]; selectedId: number | null; recommendedId: number | null; onSelect: (id: number) => void;
}) {
  if (!packages.length) return <Notice text="لا توجد باقات فعالة لهذه الخدمة حالياً." />;
  return (
    <View style={styles.packageList}>
      {packages.map((pkg) => (
        <TouchableOpacity key={pkg.id} style={[styles.packageCard, selectedId === pkg.id && styles.packageSelected]} onPress={() => onSelect(pkg.id)}>
          <View style={styles.packageTop}>
            <View>
              {recommendedId === pkg.id && <Text style={styles.recommendedLabel}>مناسب للأعمال</Text>}
              <Text style={styles.packageName}>{pkg.name}</Text>
              <Text style={styles.packagePrice}>{formatPrice(pkg.price)} درهم{pkg.billingCycle === 'monthly' ? ' / شهر' : ''}</Text>
            </View>
            <MaterialCommunityIcons name={selectedId === pkg.id ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={Colors.primary} />
          </View>
          {(pkg.features.length > 0 || pkg.description) && (
            <Text style={styles.packageFeatures} numberOfLines={3}>{pkg.features.length ? pkg.features.join(' • ') : pkg.description}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ProgressSteps({ currentStep }: { currentStep: RequestStep }) {
  const steps = ['اختر الباقة', 'أدخل التفاصيل', 'راجع وأكّد'];
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressRow}>
        {steps.map((label, index) => {
          const stepNumber = (index + 1) as RequestStep;
          const complete = currentStep > stepNumber;
          const active = currentStep === stepNumber;
          return (
            <View key={label} style={styles.progressItem}>
              <View style={[styles.progressDot, (complete || active) && styles.progressDotActive]}>
                <Text style={[styles.progressNumber, (complete || active) && styles.progressNumberActive]}>{complete ? '✓' : stepNumber}</Text>
              </View>
              <Text style={[styles.progressLabel, active && styles.progressLabelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function OptionChips({ options, selected, onSelect }: { options: Array<{ key: string; label: string }>; selected: string; onSelect: (value: string) => void }) {
  return (
    <View style={styles.optionGrid}>
      {options.map((option) => (
        <TouchableOpacity key={option.key} style={[styles.optionChip, selected === option.key && styles.optionSelected]} onPress={() => onSelect(option.key)}>
          <Text style={[styles.optionText, selected === option.key && styles.optionTextSelected]}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Field({ label, value, onChangeText, multiline, keyboardType, autoCapitalize, placeholder }: {
  label: string; value?: string; onChangeText: (value: string) => void; multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad' | 'url'; autoCapitalize?: 'none'; placeholder?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        value={value ?? ''}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        textAlign="right"
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Notice({ text, error }: { text: string; error?: boolean }) {
  return (
    <View style={[styles.notice, error && styles.noticeError]}>
      <MaterialCommunityIcons name={error ? 'alert-circle-outline' : 'information-outline'} size={20} color={error ? Colors.error : Colors.primary} />
      <Text style={[styles.noticeText, error && { color: Colors.error }]}>{text}</Text>
    </View>
  );
}

function Fallback({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={52} color={Colors.textMuted} />
        <Text style={styles.fallbackTitle}>{title}</Text>
        <Text style={styles.fallbackText}>{message}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={onRetry}><Text style={styles.secondaryButtonText}>إعادة المحاولة</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function formatPrice(price: string) {
  const parsed = Number.parseFloat(price);
  return Number.isFinite(parsed) ? parsed.toLocaleString('ar-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  backButton: { paddingTop: 3 },
  headerText: { flex: 1, alignItems: 'flex-end' },
  title: { fontFamily: 'Cairo_800ExtraBold', color: Colors.textPrimary, fontSize: 21, textAlign: 'right' },
  subtitle: { fontFamily: 'Cairo_400Regular', color: Colors.textMuted, fontSize: 13, textAlign: 'right', marginTop: 3, lineHeight: 20 },
  progressWrap: { paddingHorizontal: 24, paddingBottom: 10 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressItem: { flex: 1, alignItems: 'center' },
  progressDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  progressDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  progressNumber: { fontFamily: 'Cairo_700Bold', fontSize: 12, color: Colors.textMuted },
  progressNumberActive: { color: '#fff' },
  progressLabel: { fontFamily: 'Cairo_400Regular', color: Colors.textMuted, fontSize: 10, marginTop: 5, textAlign: 'center' },
  progressLabelActive: { fontFamily: 'Cairo_700Bold', color: Colors.primary },
  content: { padding: 16, paddingBottom: 110, gap: 14 },
  section: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 7, elevation: 2 },
  sectionTitle: { fontFamily: 'Cairo_700Bold', color: Colors.textPrimary, fontSize: 16, textAlign: 'right', marginBottom: 12 },
  packageList: { gap: 10 },
  packageCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14 },
  packageSelected: { borderColor: Colors.primary, backgroundColor: '#FFF7F7' },
  packageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packageName: { fontFamily: 'Cairo_700Bold', color: Colors.textPrimary, fontSize: 15, textAlign: 'right' },
  recommendedLabel: { alignSelf: 'flex-end', backgroundColor: '#EAF8F0', color: '#18824B', borderRadius: 8, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2, fontFamily: 'Cairo_700Bold', fontSize: 10, marginBottom: 4 },
  packagePrice: { fontFamily: 'Cairo_600SemiBold', color: Colors.primary, fontSize: 13, marginTop: 3, textAlign: 'right' },
  packageFeatures: { fontFamily: 'Cairo_400Regular', color: Colors.textMuted, fontSize: 12, lineHeight: 20, textAlign: 'right', marginTop: 8 },
  serviceHighlights: { fontFamily: 'Cairo_400Regular', color: Colors.textSecondary, fontSize: 13, lineHeight: 24, textAlign: 'right' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  platformChip: { borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { fontFamily: 'Cairo_600SemiBold', color: Colors.textPrimary, fontSize: 12 },
  optionTextSelected: { color: '#fff' },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontFamily: 'Cairo_600SemiBold', color: Colors.textPrimary, fontSize: 13, textAlign: 'right', marginBottom: 6 },
  input: { minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontFamily: 'Cairo_400Regular', fontSize: 14, paddingHorizontal: 12, backgroundColor: Colors.background },
  textarea: { minHeight: 92, paddingTop: 10, textAlignVertical: 'top' },
  reviewCard: { borderRadius: 16, backgroundColor: '#FFF7F7', borderWidth: 1, borderColor: '#FFDCDC', padding: 16 },
  reviewTitle: { fontFamily: 'Cairo_700Bold', color: Colors.textPrimary, fontSize: 16, textAlign: 'right', marginBottom: 8 },
  reviewText: { fontFamily: 'Cairo_400Regular', color: Colors.textPrimary, fontSize: 13, textAlign: 'right', marginBottom: 3 },
  reviewHint: { fontFamily: 'Cairo_400Regular', color: Colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'right', marginTop: 8 },
  notice: { backgroundColor: '#F2F7FF', borderRadius: 12, padding: 12, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 },
  noticeError: { backgroundColor: '#FEF2F2' },
  noticeText: { flex: 1, fontFamily: 'Cairo_400Regular', color: Colors.textPrimary, fontSize: 12, lineHeight: 19, textAlign: 'right' },
  primaryButton: { backgroundColor: Colors.primary, borderRadius: 15, minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  stickyFooter: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  footerPrimary: { flex: 1 },
  backStepButton: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 19, alignItems: 'center', justifyContent: 'center' },
  backStepText: { fontFamily: 'Cairo_700Bold', color: Colors.textSecondary, fontSize: 14 },
  primaryButtonText: { fontFamily: 'Cairo_700Bold', color: '#fff', fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },
  secondaryButton: { marginTop: 14, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  secondaryButtonText: { fontFamily: 'Cairo_700Bold', color: Colors.primary, fontSize: 14 },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  successIcon: { height: 84, width: 84, borderRadius: 42, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontFamily: 'Cairo_800ExtraBold', color: Colors.textPrimary, fontSize: 24, textAlign: 'center' },
  successBody: { fontFamily: 'Cairo_400Regular', color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 },
  orderNumber: { fontFamily: 'Cairo_700Bold', color: Colors.primary, fontSize: 18, textAlign: 'center', marginTop: 18 },
  fallbackTitle: { fontFamily: 'Cairo_700Bold', color: Colors.textPrimary, fontSize: 19, textAlign: 'center', marginTop: 14 },
  fallbackText: { fontFamily: 'Cairo_400Regular', color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 7, lineHeight: 22 },
});