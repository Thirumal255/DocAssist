import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Typography, Spacing, Shadows, API_URL } from '../../constants';
import { Button, Input } from '../../components';
import { useAuthStore } from '../../store';

type Role = 'doctor' | 'admin';

export default function LoginScreen() {
  const [role, setRole] = useState<Role>('doctor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login } = useAuthStore();

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
        return;
      }
      login(result.data.user, result.data.token);
      router.replace('/(app)/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Connection Error', 'Cannot connect to server. Make sure backend is running and check your API URL in .env file.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Ionicons name="medical" size={32} color={Colors.white} />
          </View>
          <Text style={styles.appName}>DocAssist</Text>
          <Text style={styles.tagline}>Smart Practice Management</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.roleTabs}>
            <TouchableOpacity style={[styles.roleTab, role === 'doctor' && styles.roleTabActive]} onPress={() => setRole('doctor')}>
              <Ionicons name="medical" size={16} color={role === 'doctor' ? Colors.teal : Colors.muted} />
              <Text style={[styles.roleTabText, role === 'doctor' && styles.roleTabTextActive]}>Doctor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleTab, role === 'admin' && styles.roleTabActive]} onPress={() => setRole('admin')}>
              <Ionicons name="business" size={16} color={role === 'admin' ? Colors.teal : Colors.muted} />
              <Text style={[styles.roleTabText, role === 'admin' && styles.roleTabTextActive]}>Admin</Text>
            </TouchableOpacity>
          </View>

          <Input label="EMAIL" icon="mail-outline" placeholder="dr.sharma@docassist.in" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
          <Input label="PASSWORD" icon="lock-closed-outline" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} rightIcon={showPassword ? 'eye-outline' : 'eye-off-outline'} onRightIconPress={() => setShowPassword(!showPassword)} error={errors.password} />

          <Button title="Sign In Securely" onPress={handleLogin} loading={isLoading} size="lg" style={styles.loginButton} />
          <TouchableOpacity style={styles.forgotLink}><Text style={styles.forgotText}>Forgot password?</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  scrollContent: { flexGrow: 1 },
  hero: { paddingTop: 80, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center' },
  logo: { width: 72, height: 72, backgroundColor: Colors.tealLight, borderRadius: BorderRadius['2xl'], alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  appName: { fontSize: Typography.fontSize['6xl'], color: Colors.white, marginBottom: 4, fontWeight: '700' },
  tagline: { fontSize: Typography.fontSize.lg, color: 'rgba(255,255,255,0.55)' },
  formContainer: { flex: 1, backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  roleTabs: { flexDirection: 'row', backgroundColor: Colors.border, borderRadius: BorderRadius.lg, padding: 4, marginBottom: 24 },
  roleTab: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  roleTabActive: { backgroundColor: Colors.white, ...Shadows.small },
  roleTabText: { fontSize: Typography.fontSize.md, fontWeight: '600', color: Colors.muted },
  roleTabTextActive: { color: Colors.teal },
  loginButton: { marginTop: 8 },
  forgotLink: { alignItems: 'center', marginTop: 16 },
  forgotText: { fontSize: Typography.fontSize.md, color: Colors.teal },
});
