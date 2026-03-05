import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { prescriptionsApi } from '../../../api'; // Adjust path if needed
import { API_URL } from '../../../api/client';
import { generatePrescriptionHtml } from '../../../utils/pdfGenerator';
import { Colors } from '../../../constants'; // Adjust path if needed

export default function PrescriptionPrintScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPrescription();
    }
  }, [id]);

  const loadPrescription = async () => {
    setIsLoading(true);
    try {
      // Fetch the prescription data from your backend
      const result = await prescriptionsApi.getById(id as string);
      
      if (result.data) {
        // You might need to map this depending on how your backend returns the data
        // The generator expects: { doctor, patient, prescription, clinic }
        setData({
          prescription: result.data,
          patient: result.data.patient,
          doctor: result.data.doctor,
          clinic: null // Pass clinic info here if you have it in your app state
        });
      } else {
        Alert.alert('Error', 'Prescription not found');
        router.back();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load prescription');
    } finally {
      setIsLoading(false);
    }
  };

  // --- ACTION: PRINT PDF ---
  const handlePrint = async () => {
    if (!data) return;
    try {
      const html = generatePrescriptionHtml(data, API_URL);
      await Print.printAsync({
        html,
        printerUrl: undefined, // Let the OS decide
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to print prescription');
    }
  };

  // --- ACTION: SHARE PDF (WhatsApp, Email, etc.) ---
  const handleShare = async () => {
    if (!data) return;
    try {
      const html = generatePrescriptionHtml(data, API_URL);
      
      // 1. Generate a PDF file in the app's cache
      const { uri } = await Print.printToFileAsync({ html });
      
      // 2. Check if sharing is available on the device
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // 3. Open the native share dialog
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Prescription_${data.patient.name}`,
        UTI: 'com.adobe.pdf', // iOS specific
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share prescription');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.teal} />
        <Text style={{ marginTop: 10, color: Colors.muted }}>Generating Document...</Text>
      </View>
    );
  }

  if (!data) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prescription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Document Preview Card */}
        <View style={styles.previewCard}>
          <View style={styles.docHeader}>
            <Ionicons name="document-text" size={40} color={Colors.teal} />
            <Text style={styles.docTitle}>Rx: {data.patient.name}</Text>
            <Text style={styles.docSub}>
              {new Date(data.prescription.createdAt).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Medicines:</Text>
            <Text style={styles.statValue}>{data.prescription.items?.length || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Diagnosis:</Text>
            <Text style={styles.statValue}>{data.prescription.diagnosis || 'N/A'}</Text>
          </View>
          {/* --- ADD THIS NEW DEBUG ROW --- */}
          <View style={[styles.statRow, { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#EEE' }]}>
            <Text style={styles.statLabel}>Applied Template:</Text>
            <Text style={[styles.statValue, { color: data.doctor?.template ? '#0A7B6E' : '#E11D48' }]}>
              {data.doctor?.template ? `✅ ${data.doctor.template.name}` : '❌ Default (None found)'}
            </Text>
          </View>
          {/* --- END DEBUG ROW --- */}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={[styles.actionBtn, styles.printBtn]} onPress={handlePrint}>
          <Ionicons name="print" size={20} color="#FFF" />
          <Text style={styles.actionBtnText}>Print Prescription</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShare}>
          <Ionicons name="share-social" size={20} color="#FFF" />
          <Text style={styles.actionBtnText}>Share PDF (WhatsApp / Email)</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  content: { padding: 20 },
  previewCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 24, 
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 
  },
  docHeader: { alignItems: 'center', marginBottom: 20 },
  docTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A', marginTop: 12 },
  docSub: { fontSize: 13, color: '#6B7C93', marginTop: 4 },
  divider: { width: '100%', height: 1, backgroundColor: '#DCE4ED', marginBottom: 20 },
  statRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statLabel: { fontSize: 14, color: '#6B7C93' },
  statValue: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  actionBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    paddingVertical: 16, borderRadius: 12, marginBottom: 16, gap: 10 
  },
  printBtn: { backgroundColor: '#0A7B6E' },
  shareBtn: { backgroundColor: '#0369A1' },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});