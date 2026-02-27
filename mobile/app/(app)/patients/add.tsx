import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { patientsApi } from '../../../api';
import { log } from '../../../utils/logger';

const MODULE = 'AddPatient';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = [
  { id: 'male', label: 'Male', icon: '👨' },
  { id: 'female', label: 'Female', icon: '👩' },
  { id: 'other', label: 'Other', icon: '🧑' },
];

export default function AddPatientScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Patient name is required');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      Alert.alert('Error', 'Valid phone number is required');
      return;
    }
    if (!dob.trim()) {
      Alert.alert('Error', 'Date of birth is required (YYYY-MM-DD)');
      return;
    }
    if (!gender) {
      Alert.alert('Error', 'Please select gender');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dob)) {
      Alert.alert('Error', 'Date format should be YYYY-MM-DD');
      return;
    }

    setIsSaving(true);
    log.action(MODULE, 'Creating patient', { name, phone });

    try {
      const patientData = {
        name: name.trim(),
        phone: phone.trim(),
        dob,
        gender,
        bloodGroup: bloodGroup || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        allergies: allergies.trim() ? allergies.split(',').map(a => a.trim()) : [],
        chronicConditions: chronicConditions.trim() ? chronicConditions.split(',').map(c => c.trim()) : [],
      };

      const result = await patientsApi.create(patientData);

      if (result.data) {
        log.info(MODULE, 'Patient created successfully');
        Alert.alert('Success', 'Patient added successfully!', [
          { text: 'View Patient', onPress: () => router.replace(`/(app)/patients/${result.data.id}`) },
          { text: 'Add Another', onPress: () => resetForm() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to add patient');
      }
    } catch (error) {
      log.error(MODULE, 'Failed to create patient', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setDob('');
    setGender('');
    setBloodGroup('');
    setEmail('');
    setAddress('');
    setAllergies('');
    setChronicConditions('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Patient</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>
          
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter patient's full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <Text style={styles.inputLabel}>Date of Birth *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (e.g., 1990-05-15)"
            value={dob}
            onChangeText={setDob}
          />

          <Text style={styles.inputLabel}>Gender *</Text>
          <View style={styles.genderRow}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.genderChip, gender === g.id && styles.genderChipActive]}
                onPress={() => setGender(g.id)}
              >
                <Text style={styles.genderIcon}>{g.icon}</Text>
                <Text style={[styles.genderText, gender === g.id && styles.genderTextActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Medical Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MEDICAL INFORMATION</Text>

          <Text style={styles.inputLabel}>Blood Group</Text>
          <View style={styles.bloodGroupRow}>
            {BLOOD_GROUPS.map(bg => (
              <TouchableOpacity
                key={bg}
                style={[styles.bloodChip, bloodGroup === bg && styles.bloodChipActive]}
                onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
              >
                <Text style={[styles.bloodText, bloodGroup === bg && styles.bloodTextActive]}>{bg}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Known Allergies</Text>
          <TextInput
            style={styles.input}
            placeholder="Comma separated (e.g., Penicillin, Sulfa)"
            value={allergies}
            onChangeText={setAllergies}
          />

          <Text style={styles.inputLabel}>Chronic Conditions</Text>
          <TextInput
            style={styles.input}
            placeholder="Comma separated (e.g., Diabetes, Hypertension)"
            value={chronicConditions}
            onChangeText={setChronicConditions}
          />
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTACT INFORMATION (OPTIONAL)</Text>

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="patient@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Full address"
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Patient</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#DCE4ED' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#0D1B2A' },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#6B7C93', letterSpacing: 1, marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#2C3E50', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE4ED', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0D1B2A' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#DCE4ED' },
  genderChipActive: { backgroundColor: '#0A7B6E', borderColor: '#0A7B6E' },
  genderIcon: { fontSize: 18 },
  genderText: { fontSize: 14, fontWeight: '500', color: '#2C3E50' },
  genderTextActive: { color: '#FFFFFF' },
  bloodGroupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bloodChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#DCE4ED' },
  bloodChipActive: { backgroundColor: '#0A7B6E', borderColor: '#0A7B6E' },
  bloodText: { fontSize: 14, fontWeight: '600', color: '#2C3E50' },
  bloodTextActive: { color: '#FFFFFF' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A7B6E', paddingVertical: 16, borderRadius: 14, marginTop: 16, gap: 8, shadowColor: '#0A7B6E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
