import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, BackHandler } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appointmentsApi, patientsApi, usersApi, availabilityApi } from '../../../api';
import { useAuthStore } from '../../../store';
import { log } from '../../../utils/logger';

const MODULE = 'NewAppointment';

interface Patient {
  id: string;
  name: string;
  phone: string;
  gender: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const APPOINTMENT_TYPES = [
  { id: 'new_visit', label: 'New Visit', icon: 'add-circle' },
  { id: 'follow_up', label: 'Follow-up', icon: 'refresh' },
  { id: 'emergency', label: 'Emergency', icon: 'alert-circle' },
];

export default function NewAppointmentScreen() {
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ patientId?: string }>();
  const isAdmin = user?.role === 'admin';

  // Form state
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isPatientLocked, setIsPatientLocked] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState('new_visit');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [notes, setNotes] = useState('');

  // Data state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // FIX: Re-added missing state variable
  const [availabilityPeriods, setAvailabilityPeriods] = useState<string[]>([]);
  
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  
  // UI state
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [step, setStep] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);

  useFocusEffect(
    useCallback(() => {
      log.screen(MODULE, 'focus - resetting form state');
      
      // 1. Reset Form
      setSelectedDate(null);
      setSelectedTime(null);
      setAppointmentType('new_visit');
      setChiefComplaint('');
      setNotes('');
      setTimeSlots([]);
      setAvailabilityPeriods([]); // Reset this too
      setPatientSearch('');
      setPatients([]);
      
      // 2. Navigation Logic
      if (params.patientId) {
        loadPatientFromParams(params.patientId);
        if (!isAdmin && user) setStep(3); 
        else setStep(1);
      } else {
        setSelectedPatient(null);
        setIsPatientLocked(false);
        
        if (!isAdmin && user) {
          setStep(2); 
        } else {
          setStep(1);
          setSelectedDoctor(null);
        }
        setIsInitialized(true);
      }

      loadDoctors();

      return () => {};
    }, [params.patientId, user?.id, isAdmin])
  );

  const loadDoctors = async () => {
    try {
      const result = await usersApi.getDoctors();
      if (result.data) {
        if (!isAdmin && user) {
          const myself = result.data.find(d => d.id === user.id);
          if (myself) {
            setDoctors([myself]);
            setSelectedDoctor(myself);
          }
        } else {
          setDoctors(result.data);
        }
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load doctors', error);
    }
  };

  const loadPatientFromParams = async (patientId: string) => {
    setIsLoadingPatient(true);
    try {
      const result = await patientsApi.getById(patientId);
      if (result.data) {
        const patient: Patient = {
          id: result.data.id,
          name: result.data.name,
          phone: result.data.phone,
          gender: result.data.gender,
        };
        setSelectedPatient(patient);
        setIsPatientLocked(true);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load patient from params', error);
    } finally {
      setIsLoadingPatient(false);
      setIsInitialized(true);
    }
  };

  // Debounced Search
  React.useEffect(() => {
    if (patientSearch.length >= 2) {
      const timer = setTimeout(searchPatients, 300);
      return () => clearTimeout(timer);
    } else {
      setPatients([]);
    }
  }, [patientSearch]);

  React.useEffect(() => {
    if (selectedDoctor) {
      generateAvailableDates();
    }
  }, [selectedDoctor]);

  React.useEffect(() => {
    if (selectedDoctor && selectedDate) {
      loadTimeSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const searchPatients = async () => {
    try {
      const result = await patientsApi.getAll(patientSearch);
      if (result.data) setPatients(result.data);
    } catch (error) {
      console.error(error);
    }
  };

  const generateAvailableDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    setAvailableDates(dates);
  };

  const loadTimeSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;
    setIsLoadingSlots(true);
    setSelectedTime(null);
    setTimeSlots([]);
    setAvailabilityPeriods([]); // Clear previous periods
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const result = await availabilityApi.getSlots(selectedDoctor.id, dateStr);
      
      if (result.data) {
        if (!result.data.available) {
          Alert.alert('Not Available', result.data.message || 'Doctor is not available on this day');
        } else {
          setTimeSlots(result.data.slots || []);
          if (result.data.periods) {
            // FIX: This setter now exists
            setAvailabilityPeriods(result.data.periods.map(p => `${p.startTime} - ${p.endTime}`));
          }
        }
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load slots', error);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDoctor || !selectedPatient || !selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please complete all fields');
      return;
    }

    const scheduledAt = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    scheduledAt.setHours(hours, minutes, 0, 0);

    setIsSaving(true);
    try {
      const result = await appointmentsApi.create({
        doctorId: selectedDoctor.id,
        patientId: selectedPatient.id,
        scheduledAt: scheduledAt.toISOString(),
        type: appointmentType as any,
        chiefComplaint: chiefComplaint || undefined,
        notes: notes || undefined,
      });

      if (result.data) {
        Alert.alert('Success', 'Appointment scheduled!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (isLoadingPatient || !isInitialized) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A7B6E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Appointment</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        {(isAdmin ? ['Doctor', 'Patient', 'Time', 'Details'] : ['Patient', 'Time', 'Details']).map((label, i) => {
          const actualStep = isAdmin ? i + 1 : i + 2; 
          return (
            <View key={i} style={styles.progressStep}>
              <View style={[styles.progressDot, step > actualStep ? styles.progressDotDone : step === actualStep ? styles.progressDotActive : {}]}>
                {step > actualStep ? <Ionicons name="checkmark" size={12} color="#FFF" /> : <Text style={[styles.progressNum, step === actualStep && styles.progressNumActive]}>{isAdmin ? i + 1 : i + 1}</Text>}
              </View>
              <Text style={[styles.progressLabel, step >= actualStep && styles.progressLabelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* STEP 1: DOCTOR (Admin only) */}
        {step === 1 && isAdmin && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Doctor</Text>
            {doctors.map(doc => (
              <TouchableOpacity key={doc.id} style={[styles.selectCard, selectedDoctor?.id === doc.id && styles.selectCardActive]} 
                onPress={() => { setSelectedDoctor(doc); setStep(2); }}>
                <View style={[styles.selectIcon, selectedDoctor?.id === doc.id && styles.selectIconActive]}>
                  <Ionicons name="medical" size={22} color={selectedDoctor?.id === doc.id ? '#FFF' : '#0A7B6E'} />
                </View>
                <View style={styles.selectInfo}>
                  <Text style={styles.selectName}>{doc.name}</Text>
                  <Text style={styles.selectMeta}>{doc.specialty}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7C93" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP 2: PATIENT */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Patient</Text>
            {selectedDoctor && isAdmin && (
              <TouchableOpacity style={styles.selectedBadge} onPress={() => setStep(1)}>
                <Ionicons name="medical" size={14} color="#0A7B6E" />
                <Text style={styles.selectedBadgeText}>{selectedDoctor.name}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#6B7C93" />
              <TextInput style={styles.searchInput} placeholder="Search name/phone..." value={patientSearch} onChangeText={setPatientSearch} />
            </View>
            {selectedPatient ? (
              <View style={[styles.selectCard, styles.selectCardActive]}>
                <View style={[styles.selectIcon, styles.selectIconActive]}><Ionicons name="person" size={22} color="#FFF" /></View>
                <View style={styles.selectInfo}>
                  <Text style={styles.selectName}>{selectedPatient.name}</Text>
                  <Text style={styles.selectMeta}>{selectedPatient.phone}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedPatient(null)}><Ionicons name="close-circle" size={24} color="#DC2626" /></TouchableOpacity>
              </View>
            ) : (
              patients.map(p => (
                <TouchableOpacity key={p.id} style={styles.selectCard} onPress={() => { setSelectedPatient(p); setPatientSearch(''); setPatients([]); }}>
                  <View style={styles.selectIcon}><Ionicons name="person" size={22} color="#0A7B6E" /></View>
                  <View style={styles.selectInfo}><Text style={styles.selectName}>{p.name}</Text><Text style={styles.selectMeta}>{p.phone}</Text></View>
                </TouchableOpacity>
              ))
            )}
            {selectedPatient && (
              <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(3)}><Text style={styles.nextBtnText}>Continue</Text><Ionicons name="arrow-forward" size={18} color="#FFF" /></TouchableOpacity>
            )}
          </View>
        )}

        {/* STEP 3: DATE & TIME */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Time</Text>
            <Text style={styles.sectionLabel}>DATE</Text>
            <FlatList horizontal data={availableDates} showsHorizontalScrollIndicator={false} keyExtractor={d => d.toISOString()} renderItem={({ item }) => (
              <TouchableOpacity style={[styles.dateChip, selectedDate?.toDateString() === item.toDateString() && styles.dateChipActive]} onPress={() => setSelectedDate(item)}>
                <Text style={[styles.dateChipDay, selectedDate?.toDateString() === item.toDateString() && styles.dateChipTextActive]}>{item.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                <Text style={[styles.dateChipNum, selectedDate?.toDateString() === item.toDateString() && styles.dateChipTextActive]}>{item.getDate()}</Text>
              </TouchableOpacity>
            )} style={{ marginBottom: 20 }} />
            
            {selectedDate && (
              <>
                <Text style={styles.sectionLabel}>SLOTS</Text>
                {/* FIX: Display available periods if any */}
                {availabilityPeriods.length > 0 && (
                  <Text style={{ fontSize: 12, color: '#6B7C93', marginBottom: 10 }}>
                    Available: {availabilityPeriods.join(', ')}
                  </Text>
                )}
                
                {isLoadingSlots ? <ActivityIndicator color="#0A7B6E" /> : (
                  <View style={styles.slotsGrid}>
                    {timeSlots.map(slot => (
                      <TouchableOpacity key={slot.time} style={[styles.timeSlot, selectedTime === slot.time && styles.timeSlotActive, !slot.available && styles.timeSlotDisabled]} 
                        onPress={() => slot.available && setSelectedTime(slot.time)} disabled={!slot.available}>
                        <Text style={[styles.timeSlotText, selectedTime === slot.time && styles.timeSlotTextActive, !slot.available && styles.timeSlotTextDisabled]}>{slot.time}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
            {selectedTime && (
              <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(4)}><Text style={styles.nextBtnText}>Continue</Text><Ionicons name="arrow-forward" size={18} color="#FFF" /></TouchableOpacity>
            )}
          </View>
        )}

        {/* STEP 4: DETAILS */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Details</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}><Ionicons name="medical" size={16} color="#0A7B6E" /><Text style={styles.summaryText}>{selectedDoctor?.name}</Text></View>
              <View style={styles.summaryItem}><Ionicons name="person" size={16} color="#0A7B6E" /><Text style={styles.summaryText}>{selectedPatient?.name}</Text></View>
              <View style={styles.summaryItem}><Ionicons name="calendar" size={16} color="#0A7B6E" /><Text style={styles.summaryText}>{formatDateDisplay(selectedDate!)} at {selectedTime}</Text></View>
            </View>
            <Text style={styles.sectionLabel}>TYPE</Text>
            <View style={styles.typeRow}>
              {APPOINTMENT_TYPES.map(type => (
                <TouchableOpacity key={type.id} style={[styles.typeChip, appointmentType === type.id && styles.typeChipActive]} onPress={() => setAppointmentType(type.id)}>
                  <Text style={[styles.typeChipText, appointmentType === type.id && styles.typeChipTextActive]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionLabel}>COMPLAINT</Text>
            <TextInput style={styles.input} placeholder="Reason..." value={chiefComplaint} onChangeText={setChiefComplaint} />
            <TouchableOpacity style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Confirm Appointment</Text>}
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#DCE4ED' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#0D1B2A' },
  progressBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30, paddingVertical: 16, backgroundColor: '#FFFFFF' },
  progressStep: { alignItems: 'center' },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#DCE4ED', alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: '#0A7B6E' },
  progressDotDone: { backgroundColor: '#0A7B6E' },
  progressNum: { fontSize: 12, fontWeight: '600', color: '#6B7C93' },
  progressNumActive: { color: '#FFFFFF' },
  progressLabel: { fontSize: 11, color: '#6B7C93', marginTop: 4 },
  progressLabelActive: { color: '#0A7B6E', fontWeight: '600' },
  content: { flex: 1 },
  stepContent: { padding: 16 },
  stepTitle: { fontSize: 22, fontWeight: '600', color: '#0D1B2A', marginBottom: 20 },
  selectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E6F5F3', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 16 },
  selectedBadgeText: { flex: 1, fontSize: 14, color: '#0A7B6E', fontWeight: '500' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE4ED', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#0D1B2A' },
  selectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  selectCardActive: { borderWidth: 2, borderColor: '#0A7B6E' },
  selectIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#E6F5F3', alignItems: 'center', justifyContent: 'center' },
  selectIconActive: { backgroundColor: '#0A7B6E' },
  selectInfo: { flex: 1 },
  selectName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  selectMeta: { fontSize: 13, color: '#6B7C93', marginTop: 2 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A7B6E', paddingVertical: 14, borderRadius: 12, marginTop: 20, gap: 8 },
  nextBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6B7C93', letterSpacing: 0.5, marginBottom: 10, marginTop: 10 },
  dateChip: { width: 54, height: 68, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  dateChipActive: { backgroundColor: '#0A7B6E' },
  dateChipDay: { fontSize: 11, color: '#6B7C93' },
  dateChipNum: { fontSize: 20, fontWeight: '700', color: '#0D1B2A', marginTop: 2 },
  dateChipTextActive: { color: '#FFFFFF' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#DCE4ED', minWidth: 75, alignItems: 'center' },
  timeSlotActive: { backgroundColor: '#0A7B6E', borderColor: '#0A7B6E' },
  timeSlotDisabled: { backgroundColor: '#F5F8FA', borderColor: '#DCE4ED' },
  timeSlotText: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  timeSlotTextActive: { color: '#FFFFFF' },
  timeSlotTextDisabled: { color: '#6B7C93' },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  summaryText: { fontSize: 15, color: '#0D1B2A' },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  typeChip: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#0A7B6E' },
  typeChipActive: { backgroundColor: '#0A7B6E' },
  typeChipText: { fontSize: 13, fontWeight: '500', color: '#0A7B6E' },
  typeChipTextActive: { color: '#FFFFFF' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE4ED', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  saveBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A7B6E', paddingVertical: 16, borderRadius: 14, marginTop: 20 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});