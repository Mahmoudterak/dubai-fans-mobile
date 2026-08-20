import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { CONTACT, PROOF_STATS } from '@/constants/config';
import { openExternalUrl } from '@/constants/externalLinks';

const CONTACT_ITEMS = [
  { icon: 'whatsapp', label: 'واتساب', value: CONTACT.whatsappNumber, url: CONTACT.whatsappUrl },
  { icon: 'email-outline', label: 'البريد الإلكتروني', value: CONTACT.email, url: `mailto:${CONTACT.email}`, fallbackUrl: CONTACT.websiteUrl },
  { icon: 'instagram', label: 'إنستغرام', value: CONTACT.instagramHandle, url: CONTACT.instagramUrl },
  { icon: 'web', label: 'الموقع الإلكتروني', value: CONTACT.websiteDisplayUrl, url: CONTACT.websiteUrl },
  { icon: 'map-marker-outline', label: 'الموقع', value: 'دبي، الإمارات العربية المتحدة', url: undefined },
];

export default function ContactScreen() {
  async function openExternalLink(url?: string, fallbackUrl?: string) {
    if (!url) {
      Alert.alert('الرابط غير متاح', 'لا يتوفر رابط لهذه الوسيلة حالياً.');
      return;
    }

    await openExternalUrl(url, fallbackUrl);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تواصل معنا</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>DF</Text>
          </View>
          <Text style={styles.heroTitle}>دبي فانز</Text>
          <Text style={styles.heroDesc}>وكالتك الرقمية المتكاملة في دبي</Text>
        </View>

        <View style={styles.statsRow}>
          {PROOF_STATS.slice(0, 3).map((stat) => (
            <View key={stat.title} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.title}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>معلومات التواصل</Text>
        <View style={styles.contactCard}>
          {CONTACT_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.contactRow, i < CONTACT_ITEMS.length - 1 && styles.contactBorder]}
              onPress={() => openExternalLink(item.url, item.fallbackUrl)}
              disabled={!item.url}
            >
              <View style={styles.contactLeft}>
                {item.url && <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />}
                <Text style={styles.contactValue}>{item.value}</Text>
              </View>
              <View style={styles.contactRight}>
                <View style={styles.contactIconWrap}>
                  <MaterialCommunityIcons name={item.icon as any} size={22} color={Colors.primary} />
                </View>
                <Text style={styles.contactLabel}>{item.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.waBtn}
          onPress={() => openExternalLink(CONTACT.whatsappUrl)}
        >
          <Text style={styles.waBtnText}>تحدث مع مستشار الآن</Text>
          <MaterialCommunityIcons name="whatsapp" size={22} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.primary, padding: 16 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: 'Cairo_700Bold', fontSize: 20, color: '#fff', flex: 1, textAlign: 'right' },
  scroll: { padding: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: 28,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { fontFamily: 'Cairo_800ExtraBold', fontSize: 26, color: '#fff' },
  heroTitle: { fontFamily: 'Cairo_800ExtraBold', fontSize: 24, color: Colors.textPrimary, marginBottom: 4 },
  heroDesc: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 20, padding: 16,
    marginBottom: 20, justifyContent: 'space-around',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: 'Cairo_800ExtraBold', fontSize: 20, color: Colors.primary },
  statLabel: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  sectionTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: Colors.textPrimary, textAlign: 'right', marginBottom: 12 },
  contactCard: {
    backgroundColor: Colors.surface, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginBottom: 20,
  },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  contactBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  contactRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  contactValue: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: Colors.textMuted, maxWidth: 180, textAlign: 'right' },
  waBtn: {
    backgroundColor: '#25D366', borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  waBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
});
