import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { clinicApi, ClinicSettings } from '../../../api';
import { Colors, BorderRadius, Typography, Spacing, Shadows } from '../../../constants';
import { Card } from '../../../components';
import { log } from '../../../utils/logger';

const MODULE = 'ClinicProfile';

export default function ClinicProfileScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ClinicSettings>>({
    name: '',
    address: '',
    phone: '',
    email: '',
    taxId: '',
    footerText: '',
    brandColor: '#0A7B6E',
    logoBase64: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await clinicApi.getSettings();
      if (result.data) {
        setFormData(result.data);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load clinic settings', error);
      Alert.alert('Error', 'Failed to load clinic settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true, // We need this to save it to the DB
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData({ ...formData, logoBase64: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Validation', 'Clinic Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const result = await clinicApi.updateSettings(formData);
      if (result.data) {
        Alert.alert('Success', 'Clinic profile updated successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to save clinic settings', error);
      Alert.alert('Error', 'Failed to save settings');
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
        <Text style={styles.headerTitle}>Clinic Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Brand & Logo</Text>
          
          <View style={styles.logoSection}>
            <TouchableOpacity style={styles.logoPicker} onPress={handlePickImage}>
              {formData.logoBase64 ? (
                <Image source={{ uri: formData.logoBase64 }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="camera" size={32} color={Colors.muted} />
                  <Text style={styles.logoPlaceholderText}>Upload Logo</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {formData.logoBase64 && (
              <TouchableOpacity style={styles.removeLogoBtn} onPress={() => setFormData({ ...formData, logoBase64: '' })}>
                <Text style={styles.removeLogoText}>Remove Logo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand Color (Hex Code)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View style={[styles.colorPreview, { backgroundColor: formData.brandColor || '#0A7B6E' }]} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="#0A7B6E"
                value={formData.brandColor}
                onChangeText={(text) => setFormData({ ...formData, brandColor: text })}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Clinic Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Clinic Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. DocAssist Care"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tax / Registration ID (GSTIN, etc.)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 29ABCDE1234F1Z5"
              value={formData.taxId}
              onChangeText={(text) => setFormData({ ...formData, taxId: text })}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Clinic Contact Number"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="contact@clinic.com"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Complete Address</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="123 Health Avenue, City, State"
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Receipt Footer Message</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Thank you for choosing us!"
              value={formData.footerText}
              onChangeText={(text) => setFormData({ ...formData, footerText: text })}
            />
          </View>
        </Card>

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
              <Text style={styles.saveBtnText}>Save Profile</Text>
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
  logoSection: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  logoPicker: { width: 120, height: 120, borderRadius: BorderRadius.xl, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  logoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  logoPlaceholderText: { fontSize: Typography.fontSize.xs, color: Colors.muted, fontWeight: '500' },
  removeLogoBtn: { marginTop: Spacing.md, padding: Spacing.sm },
  removeLogoText: { color: Colors.red, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  colorPreview: { width: 48, height: 48, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, backgroundColor: Colors.teal, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.xl, ...Shadows.small },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: Typography.fontSize.lg, fontWeight: '600', color: Colors.white },
});