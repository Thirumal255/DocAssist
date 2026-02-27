import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { prescriptionsApi, usersApi, patientsApi } from '../../../api';
import { useAuthStore } from '../../../store';
import { log } from '../../../utils/logger';

const MODULE = 'Records';

interface Doctor { id: string; name: string; }
interface Patient { id: string; name: string; }
interface Prescription {
  id: string;
  createdAt: string;
  diagnosis?: string;
  visit?: {
    patient: { id: string; name: string };
    doctor: { id: string; name: string };
  };
  items?: { medicineName: string }[];
}

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function RecordsScreen() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor';
  
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedPatient, setSelectedPatient] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      log.screen(MODULE, 'focus - resetting state');
      setSelectedDoctor('all');
      setSelectedPatient('all');
      setIsLoading(true);
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Load filters
      if (isAdmin) {
        const doctorsResult = await usersApi.getDoctors();
        if (doctorsResult.data) setDoctors(doctorsResult.data);
      }
      
      // For doctors, we get only their patients. For admin, all patients.
      const patientsResult = await patientsApi.getAll();
      if (patientsResult.data) setPatients(patientsResult.data.slice(0, 15));
      
      // Load prescriptions
      await loadPrescriptions('all', 'all');
    } catch (error) {
      log.error(MODULE, 'Failed to load data', error);
      setIsLoading(false);
    }
  };

  const loadPrescriptions = async (doctorFilter: string, patientFilter: string) => {
    try {
      const params: { doctorId?: string; patientId?: string } = {};
      if (doctorFilter !== 'all') params.doctorId = doctorFilter;
      if (patientFilter !== 'all') params.patientId = patientFilter;
      
      const result = await prescriptionsApi.getAll(params);
      if (result.data) {
        setPrescriptions(result.data);
        log.info(MODULE, `Loaded ${result.data.length} prescriptions`);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load prescriptions', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleDoctorChange = (doctorId: string) => {
    setSelectedDoctor(doctorId);
    setIsLoading(true);
    loadPrescriptions(doctorId, selectedPatient);
  };

  const handlePatientChange = (patientId: string) => {
    setSelectedPatient(patientId);
    setIsLoading(true);
    loadPrescriptions(selectedDoctor, patientId);
  };

  const renderPrescription = ({ item }: { item: Prescription }) => {
    const patientName = item.visit?.patient?.name || 'Unknown';
    const doctorName = item.visit?.doctor?.name || 'Unknown';
    const medicineCount = item.items?.length || 0;
    const firstMedicine = item.items?.[0]?.medicineName || '';
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => item.visit?.patient?.id && router.push(`/(app)/patients/${item.visit.patient.id}`)}
      >
        <View style={styles.rxIcon}>
          <Ionicons name="document-text" size={20} color="#0A7B6E" />
        </View>
        <View style={styles.rxInfo}>
          <Text style={styles.rxPatient}>{patientName}</Text>
          <Text style={styles.rxDiagnosis}>{item.diagnosis || 'General consultation'}</Text>
          {medicineCount > 0 && (
            <Text style={styles.rxMedicines}>
              {firstMedicine}{medicineCount > 1 ? ` + ${medicineCount - 1} more` : ''}
            </Text>
          )}
          <View style={styles.rxMeta}>
            <Text style={styles.rxDoctor}>{doctorName}</Text>
            <Text style={styles.rxDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6B7C93" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Records</Text>
        {isDoctor && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>My Patients</Text>
          </View>
        )}
      </View>

      {/* Doctor Filter - Admin Only */}
      {isAdmin && doctors.length > 0 && (
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Doctor:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.chip, selectedDoctor === 'all' && styles.chipActive]}
              onPress={() => handleDoctorChange('all')}
            >
              <Text style={[styles.chipText, selectedDoctor === 'all' && styles.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {doctors.map(doc => (
              <TouchableOpacity
                key={doc.id}
                style={[styles.chip, selectedDoctor === doc.id && styles.chipActive]}
                onPress={() => handleDoctorChange(doc.id)}
              >
                <Text style={[styles.chipText, selectedDoctor === doc.id && styles.chipTextActive]}>
                  {doc.name.replace('Dr. ', '')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Patient Filter */}
      {patients.length > 0 && (
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Patient:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.chip, selectedPatient === 'all' && styles.chipActive]}
              onPress={() => handlePatientChange('all')}
            >
              <Text style={[styles.chipText, selectedPatient === 'all' && styles.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {patients.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, selectedPatient === p.id && styles.chipActive]}
                onPress={() => handlePatientChange(p.id)}
              >
                <Text style={[styles.chipText, selectedPatient === p.id && styles.chipTextActive]}>
                  {p.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0A7B6E" /></View>
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={item => item.id}
          renderItem={renderPrescription}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={() => { setIsRefreshing(true); loadPrescriptions(selectedDoctor, selectedPatient); }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#6B7C93" />
              <Text style={styles.emptyText}>No prescriptions found</Text>
              <Text style={styles.emptySubtext}>
                {isDoctor ? 'Your prescription records will appear here' : 'Records will appear after consultations'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#DCE4ED' },
  headerTitle: { fontSize: 24, fontWeight: '600', color: '#0D1B2A' },
  headerBadge: { backgroundColor: '#E6F5F3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  headerBadgeText: { fontSize: 11, fontWeight: '600', color: '#0A7B6E' },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#DCE4ED' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#2C3E50', marginRight: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#F5F8FA', borderRadius: 20, marginRight: 8 },
  chipActive: { backgroundColor: '#0A7B6E' },
  chipText: { fontSize: 13, color: '#2C3E50' },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  rxIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E6F5F3', alignItems: 'center', justifyContent: 'center' },
  rxInfo: { flex: 1 },
  rxPatient: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  rxDiagnosis: { fontSize: 13, color: '#2C3E50', marginTop: 2 },
  rxMedicines: { fontSize: 12, color: '#6B7C93', marginTop: 4 },
  rxMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  rxDoctor: { fontSize: 11, color: '#0A7B6E' },
  rxDate: { fontSize: 11, color: '#6B7C93' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7C93', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#6B7C93', marginTop: 4, textAlign: 'center' },
});
