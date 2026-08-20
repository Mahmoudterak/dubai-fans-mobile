import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Switch,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/contexts/LangContext';
import { api } from '@/constants/api';

interface Profile {
  fullName?: string | null;
  mobile?: string | null;
  country?: string | null;
  companyName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  businessType?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  snapchat?: string | null;
}

interface ProfileResponse {
  fullName?: string | null;
  mobile?: string | null;
  country?: string | null;
  profile?: Omit<Profile, 'fullName' | 'mobile' | 'country'> | null;
}

export default function AccountScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { t, lang, setLang } = useLang();
  const [profile, setProfile] = useState<Profile>({});
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Profile>({});
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<'main' | 'personal' | 'business' | 'social'>('main');

  useEffect(() => {
    api.get<ProfileResponse>('/profile').then(res => {
      if (res.success) {
        const normalized: Profile = {
          ...(res.data.profile ?? {}),
          fullName: res.data.fullName ?? user?.fullName,
          mobile: res.data.mobile ?? user?.mobile,
          country: res.data.country ?? user?.country,
        };
        setProfile(normalized);
        setForm(normalized);
      }
    });
  }, [user?.country, user?.fullName, user?.mobile]);

  function set(key: keyof Profile, val: string) { setForm(f => ({ ...f, [key]: val })); }

  async function save() {
    setSaving(true);
    const res = await api.put('/profile', form);
    setSaving(false);
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProfile(form);
      setEditing(false);
      void refreshUser();
      Alert.alert('', t('saved'));
    } else {
      Alert.alert(t('error'), (res as any).error?.message ?? t('serverError'));
    }
  }

  function handleLogout() {
    Alert.alert(t('logout'), 'هل تريد تسجيل الخروج؟', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: logout },
    ]);
  }

  function MenuItem({ icon, label, onPress, danger, value, isSwitch, last }: {
    icon: string; label: string; onPress?: () => void; danger?: boolean;
    value?: boolean; isSwitch?: boolean; last?: boolean;
  }) {
    return (
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={isSwitch ? 1 : 0.7}>
        <View style={styles.menuLeft}>
          {isSwitch ? (
            <Switch
              value={value}
              onValueChange={onPress ? (v => onPress()) : undefined}
              trackColor={{ true: Colors.primary, false: Colors.border }}
              thumbColor="#fff"
            />
          ) : (
            <MaterialCommunityIcons name="chevron-left" size={20} color={danger ? Colors.error : Colors.textMuted} />
          )}
        </View>
        <Text style={[styles.menuLabel, danger && { color: Colors.error }]}>{label}</Text>
        <View style={[styles.menuIcon, { backgroundColor: danger ? '#FEF2F2' : Colors.surfaceAlt }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={danger ? Colors.error : Colors.primary} />
        </View>
      </TouchableOpacity>
    );
  }

  const avatar = user?.fullName?.charAt(0)?.toUpperCase() ?? '?';
  const profileCompletion = useMemo(() => {
    const fields = ['fullName', 'mobile', 'country', 'companyName', 'city', 'businessType', 'website', 'whatsapp'];
    const filled = fields.filter((field) => Boolean(profile[field as keyof Profile]?.trim())).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatar}</Text>
          </View>
          <Text style={styles.userName}>{user?.fullName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
         <View style={styles.completionCard}>
           <View style={styles.completionTop}>
             <Text style={styles.completionPercent}>{profileCompletion}%</Text>
             <View>
               <Text style={styles.completionTitle}>اكتمال الملف الشخصي</Text>
               <Text style={styles.completionHint}>أضف بيانات النشاط لتجربة أسرع عند إرسال الطلبات.</Text>
             </View>
           </View>
           <View style={styles.progressTrack}>
             <View style={[styles.progressFill, { width: `${profileCompletion}%` }]} />
           </View>
         </View>

        {/* Personal section */}
        <Text style={styles.sectionLabel}>{t('personalInfo')}</Text>
        <View style={styles.card}>
           {editing ? (
             <>
               <EditField label={t('fullName')} value={form.fullName ?? ''} onChange={v => set('fullName', v)} />
               <EditField label={t('mobile')} value={form.mobile ?? ''} onChange={v => set('mobile', v)} keyboard="phone-pad" />
               <EditField label={t('country')} value={form.country ?? ''} onChange={v => set('country', v)} last />
             </>
           ) : (
             <>
               <FieldRow label={t('fullName')} value={profile.fullName ?? user?.fullName ?? '—'} />
               <FieldRow label={t('email')} value={user?.email ?? '—'} />
               <FieldRow label={t('mobile')} value={profile.mobile ?? user?.mobile ?? '—'} />
               <FieldRow label={t('country')} value={profile.country ?? user?.country ?? '—'} last />
             </>
           )}
        </View>

        {/* Business section */}
        <Text style={styles.sectionLabel}>{t('businessInfo')}</Text>
        <View style={styles.card}>
          {editing ? (
            <>
              <EditField label={t('companyName')} value={form.companyName ?? ''} onChange={v => set('companyName', v)} />
               <EditField label="نوع النشاط التجاري" value={form.businessType ?? ''} onChange={v => set('businessType', v)} />
              <EditField label={t('city')} value={form.city ?? ''} onChange={v => set('city', v)} />
              <EditField label={t('website')} value={form.website ?? ''} onChange={v => set('website', v)} keyboard="url" />
               <EditField label={t('whatsapp')} value={form.whatsapp ?? ''} onChange={v => set('whatsapp', v)} keyboard="phone-pad" last />
            </>
          ) : (
            <>
              <FieldRow label={t('companyName')} value={profile.companyName ?? '—'} />
               <FieldRow label="نوع النشاط التجاري" value={profile.businessType ?? '—'} />
              <FieldRow label={t('city')} value={profile.city ?? '—'} />
              <FieldRow label={t('website')} value={profile.website ?? '—'} />
               <FieldRow label={t('whatsapp')} value={profile.whatsapp ?? '—'} last />
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                <MaterialCommunityIcons name="pencil" size={16} color={Colors.primary} />
                <Text style={styles.editBtnText}>{t('editProfile')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Social accounts */}
        <Text style={styles.sectionLabel}>{t('socialAccounts')}</Text>
        <View style={styles.card}>
          {editing ? (
            <>
               <EditField label="إنستغرام @" value={form.instagram ?? ''} onChange={v => set('instagram', v)} />
               <EditField label="فيسبوك URL" value={form.facebook ?? ''} onChange={v => set('facebook', v)} />
               <EditField label="تيك توك @" value={form.tiktok ?? ''} onChange={v => set('tiktok', v)} />
               <EditField label="سناب شات @" value={form.snapchat ?? ''} onChange={v => set('snapchat', v)} last />
            </>
          ) : (
            <>
               <SocialRow icon="instagram" label="إنستغرام" value={profile.instagram} />
               <SocialRow icon="facebook" label="فيسبوك" value={profile.facebook} />
               <SocialRow icon="music-note" label="تيك توك" value={profile.tiktok} />
               <SocialRow icon="snapchat" label="سناب شات" value={profile.snapchat} last />
            </>
          )}
        </View>

        {/* Settings */}
        <Text style={styles.sectionLabel}>الإعدادات</Text>
        <View style={styles.card}>
          <MenuItem
            icon="translate"
            label={`${t('language')}: ${lang === 'ar' ? t('arabic') : t('english')}`}
            onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          />
          <MenuItem icon="phone" label={t('contactUs')} onPress={() => router.push('/contact-screen' as any)} last />
        </View>
         {editing && (
           <View style={styles.btnRow}>
             <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setForm(profile); }}>
               <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
             </TouchableOpacity>
             <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
               {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{t('save')}</Text>}
             </TouchableOpacity>
           </View>
         )}

        {/* Logout */}
        <View style={[styles.card, { marginBottom: 40 }]}>
          <MenuItem icon="logout" label={t('logout')} onPress={handleLogout} danger last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldRowBorder]}>
      <Text style={styles.fieldValue}>{value}</Text>
      <Text style={styles.fieldLabel}>{label}</Text>
    </View>
  );
}

function SocialRow({ icon, label, value, last }: { icon: string; label: string; value?: string | null; last?: boolean }) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldRowBorder]}>
      <Text style={styles.fieldValue}>{value ?? '—'}</Text>
      <View style={styles.socialIcon}>
        <MaterialCommunityIcons name={icon as any} size={18} color={Colors.primary} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
    </View>
  );
}

function EditField({ label, value, onChange, keyboard, last }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: any; last?: boolean;
}) {
  return (
    <View style={[styles.editField, !last && styles.fieldRowBorder]}>
      <TextInput
        style={styles.editInput}
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboard ?? 'default'}
        textAlign="right"
      />
      <Text style={styles.fieldLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 20 },
  avatarWrap: { alignItems: 'center', paddingTop: 27, paddingBottom: 21 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24, shadowRadius: 14, elevation: 8, marginBottom: 12,
  },
  avatarText: { fontFamily: 'Cairo_800ExtraBold', fontSize: 32, color: '#fff' },
  userName: { fontFamily: 'Cairo_700Bold', fontSize: 20, color: Colors.textPrimary },
  userEmail: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  completionCard: { marginHorizontal: 16, backgroundColor: Colors.surface, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: '#F3D9DB' },
  completionTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  completionPercent: { fontFamily: 'Cairo_800ExtraBold', fontSize: 21, color: Colors.primary },
  completionTitle: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: Colors.textPrimary, textAlign: 'right' },
  completionHint: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 2 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#FFE2E2', marginTop: 12, overflow: 'hidden', alignItems: 'flex-end' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },
  sectionLabel: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: Colors.textMuted, textAlign: 'right', paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
  card: {
    marginHorizontal: 16, backgroundColor: Colors.surface, borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#171827', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055, shadowRadius: 11, elevation: 3,
  },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  fieldRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  fieldLabel: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textMuted },
  fieldValue: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.textPrimary },
  socialIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 4 },
  editInput: {
    flex: 1, fontFamily: 'Cairo_400Regular', fontSize: 14,
    color: Colors.textPrimary, paddingVertical: 10, textAlign: 'right',
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  editBtnText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.primary },
  btnRow: { flexDirection: 'row', gap: 10, padding: 14 },
  cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: Colors.surfaceAlt },
  cancelBtnText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  saveBtn: { flex: 2, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: Colors.primary },
  saveBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#fff' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  menuLeft: { marginLeft: 'auto' },
  menuLabel: { flex: 1, fontFamily: 'Cairo_600SemiBold', fontSize: 15, color: Colors.textPrimary, textAlign: 'right', paddingHorizontal: 12 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
