import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, BorderRadius, Typography, Spacing, Shadows } from '../../../constants';
import { patientsApi, CreatePatientData } from '../../../api';

type Gender = 'male' | 'female' | 'other';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const commonConditions = ['diabetes', 'hypertension', 'asthma', 'heart_disease', 'thyroid'];

export default function AddPatientScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'male' as Gender,
    bloodGroup: '',
    address: '',
    emergencyContact: '',
    allergies: [] as string[],
    chronicConditions: [] as string[],
  });
  const [allergyInput, setAllergyInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = 'Phone must be 10 digits';
    if (!formData.dob.trim()) newErrors.dob = 'Date of birth is required';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dob)) newErrors.dob = 'Use format: YYYY-MM-DD';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const patientData: CreatePatientData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        dob: formData.dob,
        gender: formData.gender,
        email: formData.email.trim() || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        address: formData.address.trim() || undefined,
        emergencyContact: formData.emergencyContact.trim() || undefined,
        allergies: formData.allergies,
        chronicConditions: formData.chronicConditions,
      };

      const result = await patientsApi.create(patientData);

      if (result.data) {
        Alert.alert('Success', 'Patient added successfully!', [
          { text: 'View Patient', onPress: () => router.replace({ pathname: '/(app)/patients/[id]', params: { id: result.data!.id } }) },
          { text: 'Add Another', onPress: () => resetForm() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to add patient');
      }
    } catch (err) {
      console.error('Add patient error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      dob: '',
      gender: 'male',
      bloodGroup: '',
      address: '',
      emergencyContact: '',
      allergies: [],
      chronicConditions: [],
    });
    setAllergyInput('');
    setErrors({});
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !formData.allergies.includes(allergyInput.trim())) {
      setFormData({ ...formData, allergies: [...formData.allergies, allergyInput.trim()] });
      setAllergyInput('');
    }
  };

  const removeAllergy = (allergy: string) => {
    setFormData({ ...formData, allergies: formData.allergies.filter(a => a !== allergy) });
  };

  const toggleCondition = (condition: string) => {
    if (formData.chronicConditions.includes(condition)) {
      setFormData({ ...formData, chronicConditions: formData.chronicConditions.filter(c => c !== condition) });
    } else {
      setFormData({ ...formData, chronicConditions: [...formData.chronicConditions, condition] });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Patient</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Enter patient name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="10 digit phone number"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth *</Text>
            <TextInput
              style={[styles.input, errors.dob && styles.inputError]}
              placeholder="YYYY-MM-DD"
              value={formData.dob}
              onChangeText={(text) => setFormData({ ...formData, dob: text })}
            />
            {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender *</Text>
            <View style={styles.genderRow}>
              {(['male', 'female', 'other'] as Gender[]).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, formData.gender === g && styles.genderBtnActive]}
                  onPress={() => setFormData({ ...formData, gender: g })}
                >
                  <Ionicons 
                    name={g === 'male' ? 'man' : g === 'female' ? 'woman' : 'person'} 
                    size={18} 
                    color={formData.gender === g ? Colors.white : Colors.muted} 
                  />
                  <Text style={[styles.genderText, formData.gender === g && styles.genderTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="patient@email.com"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Medical Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Blood Group</Text>
            <View style={styles.bloodGroupRow}>
              {bloodGroups.map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.bloodGroupBtn, formData.bloodGroup === bg && styles.bloodGroupBtnActive]}
                  onPress={() => setFormData({ ...formData, bloodGroup: bg })}
                >
                  <Text style={[styles.bloodGroupText, formData.bloodGroup === bg && styles.bloodGroupTextActive]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Chronic Conditions</Text>
            <View style={styles.conditionsRow}>
              {commonConditions.map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[styles.conditionChip, formData.chronicConditions.includes(cond) && styles.conditionChipActive]}
                  onPress={() => toggleCondition(cond)}
                >
                  <Text style={[styles.conditionText, formData.chronicConditions.includes(cond) && styles.conditionTextActive]}>
                    {cond.replace('_', ' ').charAt(0).toUpperCase() + cond.replace('_', ' ').slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Allergies</Text>
            <View style={styles.allergyInputRow}>
              <TextInput
                style={styles.allergyInput}
                placeholder="Add allergy..."
                value={allergyInput}
                onChangeText={setAllergyInput}
                onSubmitEditing={addAllergy}
              />
              <TouchableOpacity style={styles.addAllergyBtn} onPress={addAllergy}>
                <Ionicons name="add" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
            {formData.allergies.length > 0 && (
              <View style={styles.allergiesList}>
                {formData.allergies.map((allergy) => (
                  <View key={allergy} style={styles.allergyChip}>
                    <Text style={styles.allergyChipText}>{allergy}</Text>
                    <TouchableOpacity onPress={() => removeAllergy(allergy)}>
                      <Ionicons name="close" size={14} color={Colors.red} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Patient address"
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact</Text>
            <TextInput
              style={styles.input}
              placeholder="Emergency contact number"
              value={formData.emergencyContact}
              onChangeText={(text) => setFormData({ ...formData, emergencyContact: text })}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.submitBtnText}>Add Patient</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing['2xl'], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.fontSize['3xl'], fontWeight: '600', color: Colors.navy },
  form: { flex: 1, padding: Spacing['3xl'] },
  section: { backgroundColor: Colors.white, borderRadius: BorderRadius['2xl'], padding: Spacing['3xl'], marginBottom: Spacing['2xl'], ...Shadows.small },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '600', color: Colors.navy, marginBottom: Spacing['2xl'] },
  inputGroup: { marginBottom: Spacing['2xl'] },
  label: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.slate, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.xl, fontSize: Typography.fontSize.md, color: Colors.slate },
  inputError: { borderColor: Colors.red },
  errorText: { color: Colors.red, fontSize: Typography.fontSize.xs, marginTop: Spacing.xs },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  genderRow: { flexDirection: 'row', gap: Spacing.md },
  genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  genderBtnActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  genderText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.muted },
  genderTextActive: { color: Colors.white },
  bloodGroupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  bloodGroupBtn: { paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  bloodGroupBtnActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  bloodGroupText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.muted },
  bloodGroupTextActive: { color: Colors.white },
  conditionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  conditionChip: { paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, backgroundColor: Colors.background, borderRadius: BorderRadius['4xl'], borderWidth: 1, borderColor: Colors.border },
  conditionChipActive: { backgroundColor: Colors.tealPale, borderColor: Colors.teal },
  conditionText: { fontSize: Typography.fontSize.sm, fontWeight: '500', color: Colors.muted },
  conditionTextActive: { color: Colors.teal },
  allergyInputRow: { flexDirection: 'row', gap: Spacing.md },
  allergyInput: { flex: 1, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.xl, fontSize: Typography.fontSize.md },
  addAllergyBtn: { width: 44, height: 44, backgroundColor: Colors.teal, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  allergiesList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  allergyChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#FEE2E2', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: BorderRadius['4xl'] },
  allergyChipText: { fontSize: Typography.fontSize.sm, color: Colors.red },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, backgroundColor: Colors.teal, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.xl, ...Shadows.small },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: Typography.fontSize.lg, fontWeight: '600', color: Colors.white },
});
