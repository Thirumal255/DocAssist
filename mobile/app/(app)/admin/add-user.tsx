import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, BorderRadius, Typography, Spacing, Shadows } from '../../../constants';
import { Card } from '../../../components';
import { usersApi, CreateUserData } from '../../../api';
// --- ADDED TEMPLATES API ---
import { templatesApi, PrescriptionTemplate } from '../../../api/templates'; 
import { log } from '../../../utils/logger';

const MODULE = 'AddEditUser';

export default function AddEditUserScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- ADDED TEMPLATES STATE ---
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctor' as 'doctor' | 'admin' | 'receptionist',
    phone: '',
    specialty: '',
    registrationNo: '',
    // --- ADDED TEMPLATE ID TO FORM ---
    templateId: '',
    consultationFee: '', 
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Always load templates so the admin has options to pick from
    loadTemplates();
    if (isEditing) {
      loadUser();
    }
  }, [id]);

  // --- ADDED FUNCTION TO FETCH TEMPLATES ---
  const loadTemplates = async () => {
    try {
      const result = await templatesApi.getAll();
      if (result.data) {
        setTemplates(result.data);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load templates', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const loadUser = async () => {
    log.info(MODULE, `Loading user: ${id}`);
    try {
      const result = await usersApi.getById(id!);
      if (result.data) {
        const user = result.data;
        setFormData({
          name: user.name,
          email: user.email,
          password: '', 
          role: user.role,
          phone: user.phone || '',
          specialty: user.specialty || '',
          registrationNo: user.registrationNo || '',
          // Load existing template if they have one
          templateId: user.templateId || '',
          consultationFee: (user as any).consultationFee ? (user as any).consultationFee.toString() : '', 
        });
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load user', error);
      Alert.alert('Error', 'Failed to load user');
    } finally {
      setIsLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    
    if (!isEditing && !formData.password) newErrors.password = 'Password is required';
    else if (!isEditing && formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    log.info(MODULE, isEditing ? 'Updating user' : 'Creating user');
    setIsSaving(true);

    try {
      let result;
      // Convert the fee string back to a number
      const feeNumber = formData.consultationFee ? parseFloat(formData.consultationFee) : 0;

      if (isEditing) {
        const updateData: any = {
          name: formData.name,
          phone: formData.phone || undefined,
          specialty: formData.specialty || undefined,
          registrationNo: formData.registrationNo || undefined,
          templateId: formData.templateId || undefined,
          consultationFee: feeNumber, // <--- NEW
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        result = await usersApi.update(id!, updateData);
      } else {
        // --- NEW: Inject the parsed fee into the create payload ---
        const createPayload = { ...formData, consultationFee: feeNumber };
        result = await usersApi.create(createPayload as any);
      }

      if (result.data) {
        log.info(MODULE, `User ${isEditing ? 'updated' : 'created'} successfully`);
        Alert.alert('Success', `User ${isEditing ? 'updated' : 'created'} successfully`, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to save user');
      }
    } catch (error) {

      log.error(MODULE, 'Save failed', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit User' : 'Add User'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Dr. John Doe"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="doctor@hospital.com"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isEditing} 
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{isEditing ? 'New Password (leave blank to keep current)' : 'Password *'}</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="••••••••"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role *</Text>
            {/* Added flexWrap so they fit nicely on smaller screens */}
            <View style={[styles.roleRow, { flexWrap: 'wrap' }]}>
              <TouchableOpacity
                style={[styles.roleBtn, formData.role === 'doctor' && styles.roleBtnActive]}
                onPress={() => setFormData({ ...formData, role: 'doctor' })}
              >
                <Ionicons name="medical" size={18} color={formData.role === 'doctor' ? Colors.white : Colors.teal} />
                <Text style={[styles.roleText, formData.role === 'doctor' && styles.roleTextActive]}>Doctor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, formData.role === 'admin' && styles.roleBtnActive]}
                onPress={() => setFormData({ ...formData, role: 'admin' })}
              >
                <Ionicons name="shield" size={18} color={formData.role === 'admin' ? Colors.white : '#6366F1'} />
                <Text style={[styles.roleText, formData.role === 'admin' && styles.roleTextActive]}>Admin</Text>
              </TouchableOpacity>
              {/* --- NEW RECEPTIONIST BUTTON --- */}
              <TouchableOpacity
                style={[styles.roleBtn, formData.role === 'receptionist' && styles.roleBtnActive]}
                onPress={() => setFormData({ ...formData, role: 'receptionist' })}
              >
                <Ionicons name="desktop" size={18} color={formData.role === 'receptionist' ? Colors.white : '#F59E0B'} />
                <Text style={[styles.roleText, formData.role === 'receptionist' && styles.roleTextActive]}>Receptionist</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />
          </View>
        </Card>

        {formData.role === 'doctor' && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Doctor Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Specialty</Text>
              <TextInput
                style={styles.input}
                placeholder="General Medicine, Cardiology, etc."
                value={formData.specialty}
                onChangeText={(text) => setFormData({ ...formData, specialty: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medical Registration Number</Text>
              <TextInput
                style={styles.input}
                placeholder="MCI-12345"
                value={formData.registrationNo}
                onChangeText={(text) => setFormData({ ...formData, registrationNo: text })}
              />
            </View>

            {/* --- NEW: CONSULTATION FEE --- */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Consultation Fee (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500"
                value={formData.consultationFee}
                onChangeText={(text) => {
                  // Only allow numbers
                  const numericText = text.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, consultationFee: numericText });
                }}
                keyboardType="numeric"
              />
            </View>
            
            {/* --- ADDED TEMPLATE SELECTION --- */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Prescription Template</Text>
              {isLoadingTemplates ? (
                <ActivityIndicator size="small" color={Colors.teal} style={{ alignSelf: 'flex-start' }} />
              ) : templates.length === 0 ? (
                <Text style={{ color: Colors.muted, fontSize: 13 }}>No templates created yet.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  {templates.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        {
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: Colors.border,
                          marginHorizontal: 4,
                          backgroundColor: Colors.background,
                          alignItems: 'center',
                          flexDirection: 'row',
                          gap: 8,
                        },
                        formData.templateId === template.id && {
                          borderColor: Colors.teal,
                          backgroundColor: Colors.tealPale,
                        }
                      ]}
                      onPress={() => setFormData({ ...formData, templateId: template.id })}
                    >
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: template.brandColor }} />
                      <Text style={[
                        { fontSize: 14, color: Colors.slate },
                        formData.templateId === template.id && { color: Colors.teal, fontWeight: '600' }
                      ]}>
                        {template.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            {/* --- END TEMPLATE SELECTION --- */}

          </Card>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>{isEditing ? 'Update User' : 'Create User'}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ... keep your existing styles exactly the same ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing['2xl'], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.fontSize['3xl'], fontWeight: '600', color: Colors.navy },
  form: { flex: 1, padding: Spacing['3xl'] },
  section: { marginBottom: Spacing['2xl'] },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '600', color: Colors.navy, marginBottom: Spacing['2xl'] },
  inputGroup: { marginBottom: Spacing['2xl'] },
  label: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.slate, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.xl, fontSize: Typography.fontSize.md, color: Colors.slate },
  inputError: { borderColor: Colors.red },
  errorText: { color: Colors.red, fontSize: Typography.fontSize.xs, marginTop: Spacing.xs },
  roleRow: { flexDirection: 'row', gap: Spacing.lg },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingVertical: Spacing['2xl'], backgroundColor: Colors.background, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  roleBtnActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  roleText: { fontSize: Typography.fontSize.md, fontWeight: '600', color: Colors.slate },
  roleTextActive: { color: Colors.white },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, backgroundColor: Colors.teal, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.xl, ...Shadows.small },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: Typography.fontSize.lg, fontWeight: '600', color: Colors.white },
});