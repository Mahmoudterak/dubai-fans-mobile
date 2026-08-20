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

export default function RegisterScreen() {
  const { register } = useAuth();
  const { t } = useLang();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !mobile.trim() || !password || !confirmPassword) {
      Alert.alert(t('error'), t('required'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('error'), t('passwordMismatch'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('error'), t('passwordShort'));
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        password,
        confirmPassword,
      });
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert(t('error'), result.error ?? t('serverError'));
      }
    } catch (err) {
      console.error('[AUTH] REGISTER SCREEN ERROR', err instanceof Error ? err.message : String(err));
      Alert.alert(t('error'), t('serverError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.pageTitle}>{t('register')}</Text>

          <View style={styles.card}>
            {/* Full name */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>{t('fullName')}</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="account-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="محمد أحمد"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  textAlign="right"
                />
              </View>
            </View>

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
              <Text style={styles.label}>{t('mobile')}</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="phone-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="05XXXXXXXX"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  textAlign="right"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>{t('password')}</Text>
              <View style={styles.inputWrap}>
                <TouchableOpacity onPress={() => setShowPw(v => !v)} style={styles.inputIcon}>
                  <MaterialCommunityIcons name={showPw ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="8+ أحرف"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPw}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Confirm password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>{t('confirmPassword')}</Text>
              <View style={styles.inputWrap}>
                <TouchableOpacity onPress={() => setShowConfirmPw(v => !v)} style={styles.inputIcon}>
                  <MaterialCommunityIcons name={showConfirmPw ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="أعد كتابة كلمة المرور"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showConfirmPw}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Register button */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{t('createAccount')}</Text>}
            </TouchableOpacity>

            <View style={styles.switchWrap}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.switchLink}>{t('loginNow')}</Text>
              </TouchableOpacity>
              <Text style={styles.switchText}>{t('hasAccount')}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: 20 },
  back: { alignSelf: 'flex-end', marginBottom: 8 },
  pageTitle: { fontFamily: 'Cairo_800ExtraBold', fontSize: 26, color: Colors.textPrimary, textAlign: 'right', marginBottom: 20 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  fieldWrap: { marginBottom: 14 },
  label: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: Colors.textPrimary, textAlign: 'right', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 12,
  },
  inputIcon: { marginLeft: 8 },
  input: {
    flex: 1, fontFamily: 'Cairo_400Regular', fontSize: 14,
    color: Colors.textPrimary, paddingVertical: 13, textAlign: 'right',
  },
  btn: {
    backgroundColor: Colors.primary, paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
  switchWrap: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 6 },
  switchText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: Colors.textMuted },
  switchLink: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: Colors.primary },
});
