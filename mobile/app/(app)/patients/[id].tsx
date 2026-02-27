import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { patientsApi } from '../../../api';
import { Patient } from '../../../types';
import { log } from '../../../utils/logger';
import { useAuthStore } from '../../../store';

const MODULE = 'PatientDetail';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const calculateAge = (dob: string) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor';
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'vitals' | 'info'>('history');

  useFocusEffect(
    useCallback(() => {
      if (id) {
        loadPatient();
      }
    }, [id])
  );

  const loadPatient = async () => {
    log.info(MODULE, `Loading patient: ${id}`);
    setIsLoading(true);
    try {
      const [patientResult, historyResult] = await Promise.all([
        patientsApi.getById(id),
        patientsApi.getHistory(id)
      ]);
      
      if (patientResult.data) {
        setPatient(patientResult.data);
      }
      if (historyResult.data) {
        setHistory(historyResult.data);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load patient', error);
      Alert.alert('Error', 'Failed to load patient details');
    } finally {
      setIsLoading(false);
    }
  };

  // ALWAYS go back to previous screen
  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A7B6E" />
        </View>
      </SafeAreaView>
    );
  }

  if (!patient) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#6B7C93" />
          <Text style={styles.errorText}>Patient not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const age = calculateAge(patient.dob);
  const gender = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'O';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.patientId}>PID: #{patient.id.slice(-6).toUpperCase()}</Text>
        </View>
        
        <View style={styles.patientInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {patient.gender === 'male' ? '👨' : patient.gender === 'female' ? '👩' : '🧑'}
            </Text>
          </View>
          <View style={styles.patientDetails}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.patientMeta}>
              {age} yrs · {gender} · {patient.bloodGroup || 'N/A'} · 📞 {patient.phone}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{history.length}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{patient.chronicConditions?.length || 0}</Text>
            <Text style={styles.statLabel}>Conditions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{patient.allergies?.length || 0}</Text>
            <Text style={styles.statLabel}>Allergies</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'vitals' && styles.tabActive]}
          onPress={() => setActiveTab('vitals')}
        >
          <Text style={[styles.tabText, activeTab === 'vitals' && styles.tabTextActive]}>Vitals</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Info</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'history' && (
          <View style={styles.timeline}>
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color="#6B7C93" />
                <Text style={styles.emptyText}>No visit history</Text>
              </View>
            ) : (
              history.map((visit, index) => (
                <View key={visit.id} style={styles.timelineItem}>
                  <View style={styles.timelineDotCol}>
                    <View style={[styles.timelineDot, index > 0 && styles.timelineDotPast]} />
                    {index < history.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineCard}>
                    <Text style={styles.visitDate}>
                      {formatDate(visit.visitedAt)} — {visit.doctor?.name || 'Doctor'}
                    </Text>
                    <Text style={styles.visitDiagnosis}>{visit.diagnosis || 'General consultation'}</Text>
                    {visit.prescription?.items && (
                      <Text style={styles.visitDrugs}>
                        {visit.prescription.items.map((item: any) => item.medicineName).join(' · ')}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'vitals' && (
          <View style={styles.vitalsContainer}>
            <Text style={styles.sectionTitle}>Recent Vitals</Text>
            {history.length > 0 && history[0].vitals ? (
              <View style={styles.vitalsGrid}>
                <View style={styles.vitalCard}>
                  <Ionicons name="heart" size={20} color="#DC2626" />
                  <Text style={styles.vitalValue}>{history[0].vitals.bp || 'N/A'}</Text>
                  <Text style={styles.vitalLabel}>Blood Pressure</Text>
                </View>
                <View style={styles.vitalCard}>
                  <Ionicons name="pulse" size={20} color="#7C3AED" />
                  <Text style={styles.vitalValue}>{history[0].vitals.pulse || 'N/A'}</Text>
                  <Text style={styles.vitalLabel}>Pulse</Text>
                </View>
                <View style={styles.vitalCard}>
                  <Ionicons name="thermometer" size={20} color="#F59E0B" />
                  <Text style={styles.vitalValue}>{history[0].vitals.temperature || 'N/A'}°F</Text>
                  <Text style={styles.vitalLabel}>Temperature</Text>
                </View>
                <View style={styles.vitalCard}>
                  <Ionicons name="fitness" size={20} color="#0A7B6E" />
                  <Text style={styles.vitalValue}>{history[0].vitals.weight || 'N/A'} kg</Text>
                  <Text style={styles.vitalLabel}>Weight</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="fitness-outline" size={48} color="#6B7C93" />
                <Text style={styles.emptyText}>No vitals recorded</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'info' && (
          <View style={styles.infoContainer}>
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Personal Details</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>{formatDate(patient.dob)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{patient.gender}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Blood Group</Text>
                <Text style={styles.infoValue}>{patient.bloodGroup || 'Not recorded'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{patient.phone}</Text>
              </View>
            </View>

            {patient.chronicConditions && patient.chronicConditions.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Chronic Conditions</Text>
                <View style={styles.tagsRow}>
                  {patient.chronicConditions.map((condition, i) => (
                    <View key={i} style={styles.tagBlue}>
                      <Text style={styles.tagTextBlue}>{condition}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {patient.allergies && patient.allergies.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Allergies</Text>
                <View style={styles.tagsRow}>
                  {patient.allergies.map((allergy, i) => (
                    <View key={i} style={styles.tagRed}>
                      <Text style={styles.tagTextRed}>{allergy}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions - Role based */}
      <View style={styles.bottomActions}>
        {/* Edit Patient - Available for both Admin and Doctor */}
        <TouchableOpacity 
          style={styles.actionBtnSecondary}
          onPress={() => router.push(`/(app)/patients/edit/${patient.id}`)}
        >
          <Ionicons name="create-outline" size={20} color="#0A7B6E" />
          <Text style={styles.actionBtnSecondaryText}>Edit</Text>
        </TouchableOpacity>
        
        {/* Book Appointment - Available for both Admin and Doctor */}
        <TouchableOpacity 
          style={styles.actionBtnPrimary}
          onPress={() => router.push({ pathname: '/(app)/appointments/new', params: { patientId: patient.id } })}
        >
          <Ionicons name="calendar" size={20} color="#FFFFFF" />
          <Text style={styles.actionBtnPrimaryText}>Appointment</Text>
        </TouchableOpacity>
        
        {/* Write Prescription - ONLY for Doctors */}
        {isDoctor && (
          <TouchableOpacity 
            style={styles.actionBtnPrimary}
            onPress={() => router.push({ pathname: '/(app)/prescriptions/new', params: { patientId: patient.id } })}
          >
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnPrimaryText}>Write Rx</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#6B7C93', marginTop: 12 },
  backButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#0A7B6E', borderRadius: 8 },
  backButtonText: { color: '#FFFFFF', fontWeight: '600' },
  header: { backgroundColor: '#0D1B2A', paddingHorizontal: 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  patientId: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  patientInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#0FA68E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24 },
  patientDetails: { flex: 1 },
  patientName: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  patientMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#DCE4ED' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#0A7B6E' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7C93' },
  tabTextActive: { color: '#0A7B6E' },
  content: { flex: 1, padding: 16 },
  timeline: {},
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineDotCol: { alignItems: 'center', marginRight: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0A7B6E' },
  timelineDotPast: { backgroundColor: '#6B7C93' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#DCE4ED', marginTop: 4 },
  timelineCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  visitDate: { fontSize: 11, color: '#6B7C93' },
  visitDiagnosis: { fontSize: 14, fontWeight: '600', color: '#0D1B2A', marginTop: 4 },
  visitDrugs: { fontSize: 12, color: '#6B7C93', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#6B7C93', marginTop: 12 },
  vitalsContainer: { padding: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0D1B2A', marginBottom: 12 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vitalCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  vitalValue: { fontSize: 20, fontWeight: '700', color: '#0D1B2A', marginTop: 8 },
  vitalLabel: { fontSize: 11, color: '#6B7C93', marginTop: 4 },
  infoContainer: {},
  infoSection: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F8FA' },
  infoLabel: { fontSize: 13, color: '#6B7C93' },
  infoValue: { fontSize: 13, fontWeight: '500', color: '#0D1B2A' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBlue: { backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagTextBlue: { fontSize: 12, color: '#0369A1', fontWeight: '500' },
  tagRed: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagTextRed: { fontSize: 12, color: '#DC2626', fontWeight: '500' },
  bottomActions: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#DCE4ED' },
  actionBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: '#E6F5F3', borderRadius: 12 },
  actionBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#0A7B6E' },
  actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: '#0A7B6E', borderRadius: 12 },
  actionBtnPrimaryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
