import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { patientsApi } from '../../../api';
import { Patient } from '../../../types';
import { useAuthStore } from '../../../store';
import { log } from '../../../utils/logger';

const MODULE = 'PatientsList';

const calculateAge = (dob: string) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

export default function PatientsListScreen() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor';
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      log.screen(MODULE, 'focus - resetting state');
      setSearchQuery('');
      setIsLoading(true);
      loadPatients();
    }, [])
  );

  const loadPatients = async (search?: string) => {
    try {
      // For doctors, the backend automatically filters to only their patients
      // For admin, shows all patients
      const result = await patientsApi.getAll(search);
      if (result.data) {
        setPatients(result.data);
        log.info(MODULE, `Loaded ${result.data.length} patients`);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load patients', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2 || text.length === 0) {
      loadPatients(text || undefined);
    }
  };

  const renderPatient = ({ item }: { item: Patient }) => {
    const age = calculateAge(item.dob);
    const gender = item.gender === 'male' ? 'M' : item.gender === 'female' ? 'F' : 'O';
    
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/patients/${item.id}`)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.gender === 'male' ? '👨' : item.gender === 'female' ? '👩' : '🧑'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>{age} yrs · {gender} · {item.phone}</Text>
          {item.chronicConditions && item.chronicConditions.length > 0 && (
            <View style={styles.tagsRow}>
              {item.chronicConditions.slice(0, 2).map((c, i) => (
                <View key={i} style={styles.tag}><Text style={styles.tagText}>{c}</Text></View>
              ))}
              {item.chronicConditions.length > 2 && <Text style={styles.moreTag}>+{item.chronicConditions.length - 2}</Text>}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6B7C93" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patients</Text>
        <View style={styles.headerRight}>
          {isDoctor && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>My Patients</Text>
            </View>
          )}
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(app)/patients/add')}>
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#6B7C93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color="#6B7C93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0A7B6E" /></View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={item => item.id}
          renderItem={renderPatient}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={() => { setIsRefreshing(true); loadPatients(searchQuery || undefined); }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#6B7C93" />
              <Text style={styles.emptyText}>{searchQuery ? 'No patients found' : 'No patients yet'}</Text>
              <Text style={styles.emptySubtext}>
                {isDoctor 
                  ? 'Patients you have appointments with will appear here' 
                  : 'Add your first patient to get started'
                }
              </Text>
              {!searchQuery && isAdmin && (
                <TouchableOpacity style={styles.addPatientBtn} onPress={() => router.push('/(app)/patients/add')}>
                  <Ionicons name="add-circle" size={18} color="#FFF" />
                  <Text style={styles.addPatientBtnText}>Add Patient</Text>
                </TouchableOpacity>
              )}
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBadge: { backgroundColor: '#E6F5F3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  headerBadgeText: { fontSize: 11, fontWeight: '600', color: '#0A7B6E' },
  addBtn: { width: 40, height: 40, backgroundColor: '#0A7B6E', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { padding: 16, backgroundColor: '#FFF' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F8FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#0D1B2A' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#E6F5F3', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  meta: { fontSize: 13, color: '#6B7C93', marginTop: 2 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  tag: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, color: '#0369A1', fontWeight: '500' },
  moreTag: { fontSize: 10, color: '#6B7C93' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7C93', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#6B7C93', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  addPatientBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#0A7B6E', borderRadius: 10 },
  addPatientBtnText: { color: '#FFF', fontWeight: '600' },
});
