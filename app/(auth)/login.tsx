import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/contexts/LangContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert(t('error'), t('required'));
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert(t('error'), result.error ?? t('serverError'));
      }
    } catch (err) {
      console.error('[AUTH] LOGIN SCREEN ERROR', err instanceof Error ? err.message : String(err));
      Alert.alert(t('error'), t('serverError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>DF</Text>
            </View>
            <Text style={styles.appName}>{t('appNameEn')}</Text>
            <Text style={styles.appNameAr}>{t('appName')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{t('login')}</Text>
            <Text style={styles.subtitle}>{t('welcome')}</Text>

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>{t('email')}</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="email-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>{t('password')}</Text>
              <View style={styles.inputWrap}>
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.inputIcon}>
                  <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Login button */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{t('login')}</Text>}
            </TouchableOpacity>
            <View style={styles.securityNote}>
              <MaterialCommunityIcons name="shield-check-outline" size={18} color={Colors.success} />
              <Text style={styles.securityNoteText}>يتم حفظ جلستك بأمان على هذا الجهاز.</Text>
            </View>

            {/* Register link */}
            <View style={styles.switchWrap}>
              <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
                <Text style={styles.switchLink}>{t('createAccount')}</Text>
              </TouchableOpacity>
              <Text style={styles.switchText}>{t('noAccount')}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 30, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 34 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24, shadowRadius: 14, elevation: 8,
  },
  logoText: { fontFamily: 'Cairo_800ExtraBold', fontSize: 28, color: '#fff' },
  appName: { fontFamily: 'Cairo_800ExtraBold', fontSize: 22, color: Colors.textPrimary },
  appNameAr: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: 22,
    shadowColor: '#171827', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  title: { fontFamily: 'Cairo_800ExtraBold', fontSize: 27, color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  subtitle: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'right', marginBottom: 24 },
  fieldWrap: { marginBottom: 16 },
  label: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.textPrimary, textAlign: 'right', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 12,
  },
  inputIcon: { marginLeft: 8 },
  input: {
    flex: 1, fontFamily: 'Cairo_400Regular', fontSize: 14,
    color: Colors.textPrimary, paddingVertical: 13, textAlign: 'right',
  },
  btn: {
    backgroundColor: Colors.primary, paddingVertical: 16,
    borderRadius: 15, alignItems: 'center', marginTop: 8, minHeight: 52,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 13 },
  securityNoteText: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: Colors.textMuted },
  switchWrap: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 6 },
  switchText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted },
  switchLink: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: Colors.primary },
});
