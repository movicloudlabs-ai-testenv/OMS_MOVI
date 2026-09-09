import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Fingerprint,
  ChevronRight,
  User,
  Users,
  Clock,
  Briefcase,
  GraduationCap,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { SecureStorage } from '../../services/storage';

export const LoginScreen: React.FC = () => {
  const { login, biometricLogin, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isFocusedInput, setIsFocusedInput] = useState<'id' | 'pass' | null>(null);

  // Restore saved email if remember me was active
  useEffect(() => {
    const restoreSavedAccount = async () => {
      try {
        const savedEmail = await SecureStorage.get('REMEMBERED_EMAIL');
        if (savedEmail) {
          setIdentifier(savedEmail);
        }
      } catch (e) {
        // Ignore
      }
    };
    restoreSavedAccount();
  }, []);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email or Employee ID and password');
      return;
    }
    setError('');
    try {
      if (rememberMe) {
        await SecureStorage.set('REMEMBERED_EMAIL', identifier.trim());
      } else {
        await SecureStorage.delete('REMEMBERED_EMAIL');
      }
      await login(identifier.trim(), password);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please verify credentials.';
      setError(msg);
      Alert.alert('Authentication Failed', msg);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const ok = await biometricLogin();
      if (!ok) {
        Alert.alert(
          'Biometric Login',
          'No saved session found or authentication cancelled. Please sign in once with your credentials to enable biometrics.'
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Biometric authentication failed.');
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Corporate Password',
      'For enterprise security, password resets must be initiated through your corporate portal or by contacting your IT/HR administrator.',
      [{ text: 'Understood' }]
    );
  };

  // Quick Demo Autofill Switchers with actual backend seed accounts
  const fillRole = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8FC" />
      <ImageBackground
        source={require('../../../assets/login_bg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top Navigation / Brand Bar */}
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
                <View style={styles.brandTextGroup}>
                  <Text style={styles.brandName}>MOVI</Text>
                  <Text style={styles.brandTag}>CLOUD LABS</Text>
                </View>
              </View>

              <View style={styles.taglineBlock}>
                <Text style={styles.taglineLine1}>Work Smarter.</Text>
                <Text style={styles.taglineLine2}>Go Further.</Text>
              </View>
            </View>

            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroLeft}>
                <View style={styles.accentDash} />
                <Text style={styles.platformLabel}>ENTERPRISE WORKSPACE PLATFORM</Text>
                <Text style={styles.heroTitleMain}>Secure Access</Text>
                <Text style={styles.heroTitleSub}>to What Moves You</Text>
                <Text style={styles.heroPillars}>People  •  Process  •  Progress</Text>
              </View>

              {/* Floating Glassmorphism Badge */}
              <View style={styles.heroFloatingBadge}>
                <View style={styles.badgeIndicator} />
                <View>
                  <Text style={styles.badgeWord}>BUILD</Text>
                  <Text style={styles.badgeWord}>CONNECT</Text>
                  <Text style={styles.badgeWord}>EMPOWER</Text>
                </View>
              </View>
            </View>

            {/* White Elevated Sign-In Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sign In</Text>
              <Text style={styles.cardSubtitle}>Enter your corporate credentials</Text>

              {/* Email / Employee ID Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email or Employee ID</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isFocusedInput === 'id' && styles.inputFocused,
                  ]}
                >
                  <Mail color="#94A3B8" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="you@company.com"
                    placeholderTextColor="#94A3B8"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setIsFocusedInput('id')}
                    onBlur={() => setIsFocusedInput(null)}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isFocusedInput === 'pass' && styles.inputFocused,
                  ]}
                >
                  <Lock color="#94A3B8" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setIsFocusedInput('pass')}
                    onBlur={() => setIsFocusedInput(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eyeButton}
                  >
                    {showPassword ? (
                      <EyeOff color="#94A3B8" size={18} />
                    ) : (
                      <Eye color="#94A3B8" size={18} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me & Forgot Password Row */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.rememberGroup}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe ? <Check color="#FFFFFF" size={12} strokeWidth={3} /> : null}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Primary Sign-In Button */}
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Sign In to Workspace</Text>
                    <ArrowRight color="#FFFFFF" size={18} strokeWidth={2.4} />
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Secondary Biometrics Button */}
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricAuth}
                activeOpacity={0.8}
              >
                <View style={styles.biometricIconWrap}>
                  <Fingerprint color="#2563EB" size={22} strokeWidth={2.2} />
                </View>
                <Text style={styles.biometricLabel}>Use FaceID / Biometrics</Text>
                <ChevronRight color="#94A3B8" size={18} />
              </TouchableOpacity>
            </View>

            {/* Demo Quick-Login Chips */}
            <View style={styles.demoSection}>
              <Text style={styles.demoHeading}>DEMO QUICK-LOGIN</Text>
              <View style={styles.demoChipsRow}>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => fillRole('aswanthksv@gmail.com', 'Admin@123')}
                  activeOpacity={0.7}
                >
                  <User color="#475569" size={13} style={styles.demoChipIcon} />
                  <Text style={styles.demoChipLabel}>Admin</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => fillRole('sarah.hr@owms.com', 'HR@123456')}
                  activeOpacity={0.7}
                >
                  <Users color="#475569" size={13} style={styles.demoChipIcon} />
                  <Text style={styles.demoChipLabel}>HR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => fillRole('pmo@owms.com', 'PMO@12345')}
                  activeOpacity={0.7}
                >
                  <Clock color="#475569" size={13} style={styles.demoChipIcon} />
                  <Text style={styles.demoChipLabel}>PMO</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => fillRole('alex.emp@owms.com', 'Emp@12345')}
                  activeOpacity={0.7}
                >
                  <Briefcase color="#475569" size={13} style={styles.demoChipIcon} />
                  <Text style={styles.demoChipLabel}>Employee</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => fillRole('rahul.intern@owms.com', 'Int@12345')}
                  activeOpacity={0.7}
                >
                  <GraduationCap color="#475569" size={13} style={styles.demoChipIcon} />
                  <Text style={styles.demoChipLabel}>Intern</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.footerCopyright}>© 2026 Movi Cloud Labs</Text>
              <View style={styles.footerLinks}>
                <Text style={styles.footerLink}>Privacy</Text>
                <Text style={styles.footerDot}>|</Text>
                <Text style={styles.footerLink}>Terms</Text>
                <Text style={styles.footerDot}>|</Text>
                <Text style={styles.footerLink}>Support</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8FC',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 36) + 10,
    paddingBottom: 24,
  },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 9,
  },
  brandTextGroup: {
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
    lineHeight: 20,
  },
  brandTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.8,
    marginTop: 0,
  },
  taglineBlock: {
    alignItems: 'flex-end',
  },
  taglineLine1: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 14,
  },
  taglineLine2: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 14,
  },

  /* Hero Section */
  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 14,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  accentDash: {
    width: 26,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#2563EB',
    marginBottom: 8,
  },
  platformLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#64748B',
    marginBottom: 4,
  },
  heroTitleMain: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    lineHeight: 29,
  },
  heroTitleSub: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: -0.3,
    lineHeight: 29,
    marginBottom: 6,
  },
  heroPillars: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  heroFloatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(219, 234, 254, 0.9)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginTop: 20,
    shadowColor: '#2563EB',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  badgeIndicator: {
    width: 2.5,
    height: 26,
    borderRadius: 2,
    backgroundColor: '#2563EB',
    marginRight: 7,
  },
  badgeWord: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#475569',
    lineHeight: 11,
  },

  /* White Sign-In Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 11,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 5,
  },
  inputContainer: {
    height: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    height: '100%',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 6,
  },

  /* Action Row */
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 13,
  },
  rememberGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
  },
  checkboxActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  rememberText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 12.5,
    color: '#2563EB',
    fontWeight: '600',
  },

  /* Error Box */
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 11.5,
    color: '#DC2626',
    fontWeight: '500',
  },

  /* Primary Button */
  primaryButton: {
    height: 48,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    marginBottom: 11,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#94A3B8',
    marginHorizontal: 10,
  },

  /* Biometrics Button */
  biometricButton: {
    height: 47,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  biometricIconWrap: {
    marginRight: 9,
  },
  biometricLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },

  /* Demo Quick-Login Section */
  demoSection: {
    marginTop: 14,
    alignItems: 'center',
  },
  demoHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#64748B',
    marginBottom: 8,
  },
  demoChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 9999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    margin: 3,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  demoChipIcon: {
    marginRight: 4,
  },
  demoChipLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#334155',
  },

  /* Footer */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  footerCopyright: {
    fontSize: 10.5,
    color: '#64748B',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 10.5,
    color: '#64748B',
  },
  footerDot: {
    fontSize: 10.5,
    color: '#CBD5E1',
    marginHorizontal: 5,
  },
});
