import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { templatesApi } from '../../../../api/templates'; // Adjust path if needed

export default function CreateTemplateScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [brandColor, setBrandColor] = useState('#0A7B6E');
  const [headerStyle, setHeaderStyle] = useState('left');
  const [showVitals, setShowVitals] = useState(true);
  const [showDiagnosis, setShowDiagnosis] = useState(true);
  
  // Image URIs
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('brandColor', brandColor);
      formData.append('headerStyle', headerStyle);
      formData.append('showVitals', String(showVitals));
      formData.append('showDiagnosis', String(showDiagnosis));
      formData.append('showPatientDetails', 'true'); // Defaulting to true for now
      formData.append('paperSize', 'A4');

      // Append Logo if selected
      if (logoUri) {
        const filename = logoUri.split('/').pop() || 'logo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        
        formData.append('logo', {
          uri: logoUri,
          name: filename,
          type,
        } as any);
      }

      await templatesApi.create(formData);
      
      Alert.alert('Success', 'Template created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Template</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          <Text style={styles.label}>Template Name (e.g., "Main Branch Blue")</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter name" />
          
          <Text style={styles.label}>Brand Color (Hex Code)</Text>
          <TextInput style={styles.input} value={brandColor} onChangeText={setBrandColor} placeholder="#0A7B6E" />
        </View>

        {/* Logo Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinic Logo</Text>
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Ionicons name="cloud-upload-outline" size={32} color="#6B7C93" />
                <Text style={styles.imagePickerText}>Upload Logo Image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Layout & Content</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show Patient Vitals</Text>
            <Switch value={showVitals} onValueChange={setShowVitals} trackColor={{ true: '#0A7B6E' }} />
          </View>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show Diagnosis</Text>
            <Switch value={showDiagnosis} onValueChange={setShowDiagnosis} trackColor={{ true: '#0A7B6E' }} />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]} 
          onPress={handleSave} 
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Template</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  content: { padding: 20 },
  section: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0D1B2A', marginBottom: 16 },
  label: { fontSize: 13, color: '#6B7C93', marginBottom: 6, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#DCE4ED', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 16, color: '#0D1B2A' },
  imagePickerBtn: { borderWidth: 1, borderColor: '#DCE4ED', borderStyle: 'dashed', borderRadius: 8, overflow: 'hidden' },
  imagePickerPlaceholder: { padding: 30, alignItems: 'center' },
  imagePickerText: { marginTop: 8, color: '#6B7C93', fontSize: 14 },
  previewImage: { width: '100%', height: 150, resizeMode: 'contain' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F8FA' },
  switchLabel: { fontSize: 15, color: '#2C3E50' },
  saveBtn: { backgroundColor: '#0A7B6E', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});