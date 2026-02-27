import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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

  // Form state - ALWAYS start fresh
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isPatientLocked, setIsPatientLocked] = useState(false); // Patient came from params
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
  const [availabilityPeriods, setAvailabilityPeriods] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  
  // UI state
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [step, setStep] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize on mount - CLEAR ALL STATE and load fresh
  useEffect(() => {
    log.screen(MODULE, 'mount', { patientId: params.patientId });
    
    // Reset all form state
    setSelectedDoctor(null);
    setSelectedPatient(null);
    setIsPatientLocked(false);
    setSelectedDate(null);
    setSelectedTime(null);
    setAppointmentType('new_visit');
    setChiefComplaint('');
    setNotes('');
    setTimeSlots([]);
    setStep(1);
    
    // Load doctors
    loadDoctors();
    
    // If patientId passed, load that patient
    if (params.patientId) {
      loadPatientFromParams(params.patientId);
    } else {
      setIsInitialized(true);
    }
  }, [params.patientId]);

  // Auto-select doctor for non-admin
  useEffect(() => {
    if (isInitialized && !isAdmin && user && doctors.length > 0 && !selectedDoctor) {
      const selfDoctor = doctors.find(d => d.id === user.id);
      if (selfDoctor) {
        setSelectedDoctor(selfDoctor);
        // If patient is pre-selected, go to step 3
        if (isPatientLocked && selectedPatient) {
          setStep(3);
        } else {
          setStep(2);
        }
      }
    }
  }, [isInitialized, isAdmin, user, doctors, selectedDoctor, isPatientLocked, selectedPatient]);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      searchPatients();
    } else {
      setPatients([]);
    }
  }, [patientSearch]);

  useEffect(() => {
    if (selectedDoctor) {
      generateAvailableDates();
    }
  }, [selectedDoctor]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      loadTimeSlots();
    }
  }, [selectedDoctor, selectedDate]);

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
        log.info(MODULE, `Pre-selected patient: ${patient.name}`);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load patient from params', error);
    } finally {
      setIsLoadingPatient(false);
      setIsInitialized(true);
    }
  };

  const loadDoctors = async () => {
    try {
      const result = await usersApi.getDoctors();
      if (result.data) {
        setDoctors(result.data);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load doctors', error);
    }
  };

  const searchPatients = async () => {
    try {
      const result = await patientsApi.getAll(patientSearch);
      if (result.data) {
        setPatients(result.data);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to search patients', error);
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
    setAvailabilityPeriods([]);
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const result = await availabilityApi.getSlots(selectedDoctor.id, dateStr);
      
      if (result.data) {
        if (!result.data.available) {
          Alert.alert('Not Available', result.data.message || 'Doctor is not available on this day');
        } else {
          setTimeSlots(result.data.slots || []);
          if (result.data.periods) {
            setAvailabilityPeriods(result.data.periods.map(p => `${p.startTime} - ${p.endTime}`));
          }
        }
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load time slots', error);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDoctor) {
      Alert.alert('Error', 'Please select a doctor');
      return;
    }
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please select date and time');
      return;
    }

    const scheduledAt = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    scheduledAt.setHours(hours, minutes, 0, 0);

    log.info(MODULE, 'Creating appointment', {
      doctorId: selectedDoctor.id,
      patientId: selectedPatient.id,
      scheduledAt: scheduledAt.toISOString()
    });

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
        log.info(MODULE, 'Appointment created successfully');
        Alert.alert('Success', 'Appointment scheduled successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create appointment');
      }
    } catch (error) {
      log.error(MODULE, 'Create failed', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (isLoadingPatient || !isInitialized) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A7B6E" />
          <Text style={styles.loadingText}>Loading...</Text>
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

      {/* Progress Steps */}
      <View style={styles.progressBar}>
        {['Doctor', 'Patient', 'Time', 'Details'].map((label, i) => (
          <View key={i} style={styles.progressStep}>
            <View style={[styles.progressDot, step > i && styles.progressDotDone, step === i + 1 && styles.progressDotActive]}>
              {step > i + 1 ? (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              ) : (
                <Text style={[styles.progressNum, (step >= i + 1) && styles.progressNumActive]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.progressLabel, step >= i + 1 && styles.progressLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Step 1: Select Doctor */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Doctor</Text>
            <Text style={styles.stepSubtitle}>Choose the doctor for this appointment</Text>
            
            {/* Show pre-selected patient info if exists */}
            {isPatientLocked && selectedPatient && (
              <View style={styles.lockedBadge}>
                <Ionicons name="person" size={16} color="#0A7B6E" />
                <Text style={styles.lockedBadgeText}>Patient: {selectedPatient.name}</Text>
                <Ionicons name="lock-closed" size={14} color="#6B7C93" />
              </View>
            )}
            
            {doctors.length === 0 ? (
              <ActivityIndicator color="#0A7B6E" style={{ marginTop: 30 }} />
            ) : (
              doctors.map(doc => (
                <TouchableOpacity
                  key={doc.id}
                  style={[styles.selectCard, selectedDoctor?.id === doc.id && styles.selectCardActive]}
                  onPress={() => { 
                    setSelectedDoctor(doc); 
                    // Skip patient step if patient is pre-selected
                    setStep(isPatientLocked ? 3 : 2); 
                  }}
                >
                  <View style={[styles.selectIcon, selectedDoctor?.id === doc.id && styles.selectIconActive]}>
                    <Ionicons name="medical" size={22} color={selectedDoctor?.id === doc.id ? '#FFFFFF' : '#0A7B6E'} />
                  </View>
                  <View style={styles.selectInfo}>
                    <Text style={styles.selectName}>{doc.name}</Text>
                    <Text style={styles.selectMeta}>{doc.specialty || 'General Medicine'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6B7C93" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Step 2: Select Patient (Skip if pre-selected) */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Patient</Text>
            <Text style={styles.stepSubtitle}>Search and select the patient</Text>
            
            {selectedDoctor && (
              <TouchableOpacity style={styles.selectedBadge} onPress={() => isAdmin && setStep(1)}>
                <Ionicons name="medical" size={14} color="#0A7B6E" />
                <Text style={styles.selectedBadgeText}>{selectedDoctor.name}</Text>
                {isAdmin && <Ionicons name="pencil" size={14} color="#0A7B6E" />}
              </TouchableOpacity>
            )}

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#6B7C93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or phone..."
                value={patientSearch}
                onChangeText={setPatientSearch}
                autoCapitalize="none"
              />
              {patientSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPatientSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#6B7C93" />
                </TouchableOpacity>
              )}
            </View>

            {selectedPatient && !isPatientLocked && (
              <View style={[styles.selectCard, styles.selectCardActive]}>
                <View style={[styles.selectIcon, styles.selectIconActive]}>
                  <Ionicons name="person" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.selectInfo}>
                  <Text style={styles.selectName}>{selectedPatient.name}</Text>
                  <Text style={styles.selectMeta}>{selectedPatient.phone}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                  <Ionicons name="close-circle" size={22} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}

            {!selectedPatient && patients.map(patient => (
              <TouchableOpacity
                key={patient.id}
                style={styles.selectCard}
                onPress={() => { setSelectedPatient(patient); setPatientSearch(''); setPatients([]); }}
              >
                <View style={styles.selectIcon}>
                  <Ionicons name="person" size={22} color="#0A7B6E" />
                </View>
                <View style={styles.selectInfo}>
                  <Text style={styles.selectName}>{patient.name}</Text>
                  <Text style={styles.selectMeta}>{patient.phone}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {patientSearch.length >= 2 && patients.length === 0 && !selectedPatient && (
              <Text style={styles.noResults}>No patients found</Text>
            )}

            {selectedPatient && (
              <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(3)}>
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Date & Time</Text>
            
            {/* Show selected/locked patient */}
            <TouchableOpacity 
              style={[styles.selectedBadge, isPatientLocked && styles.lockedBadge]} 
              onPress={() => !isPatientLocked && setStep(2)}
              disabled={isPatientLocked}
            >
              <Ionicons name="person" size={14} color="#0A7B6E" />
              <Text style={styles.selectedBadgeText}>{selectedPatient?.name}</Text>
              {isPatientLocked ? (
                <Ionicons name="lock-closed" size={14} color="#6B7C93" />
              ) : (
                <Ionicons name="pencil" size={14} color="#0A7B6E" />
              )}
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>SELECT DATE</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={availableDates}
              keyExtractor={item => item.toISOString()}
              renderItem={({ item }) => {
                const isSelected = selectedDate?.toDateString() === item.toDateString();
                return (
                  <TouchableOpacity
                    style={[styles.dateChip, isSelected && styles.dateChipActive]}
                    onPress={() => setSelectedDate(item)}
                  >
                    <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextActive]}>
                      {item.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dateChipNum, isSelected && styles.dateChipTextActive]}>
                      {item.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              style={{ marginBottom: 20 }}
            />

            {selectedDate && (
              <>
                <Text style={styles.sectionLabel}>
                  AVAILABLE SLOTS {availabilityPeriods.length > 0 && `(${availabilityPeriods.join(', ')})`}
                </Text>
                
                {isLoadingSlots ? (
                  <ActivityIndicator color="#0A7B6E" style={{ marginVertical: 30 }} />
                ) : timeSlots.length > 0 ? (
                  <View style={styles.slotsGrid}>
                    {timeSlots.map(slot => (
                      <TouchableOpacity
                        key={slot.time}
                        style={[
                          styles.timeSlot,
                          selectedTime === slot.time && styles.timeSlotActive,
                          !slot.available && styles.timeSlotDisabled
                        ]}
                        onPress={() => slot.available && setSelectedTime(slot.time)}
                        disabled={!slot.available}
                      >
                        <Text style={[
                          styles.timeSlotText,
                          selectedTime === slot.time && styles.timeSlotTextActive,
                          !slot.available && styles.timeSlotTextDisabled
                        ]}>
                          {slot.time}
                        </Text>
                        {!slot.available && <Text style={styles.bookedLabel}>Booked</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noSlotsContainer}>
                    <Ionicons name="calendar-outline" size={40} color="#6B7C93" />
                    <Text style={styles.noSlotsText}>Doctor is not available on this day</Text>
                    <Text style={styles.noSlotsHint}>Please select another date</Text>
                  </View>
                )}
              </>
            )}

            {selectedTime && (
              <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(4)}>
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 4: Appointment Details */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Appointment Details</Text>
            
            {/* Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Ionicons name="medical" size={16} color="#0A7B6E" />
                <Text style={styles.summaryText}>{selectedDoctor?.name}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="person" size={16} color="#0A7B6E" />
                <Text style={styles.summaryText}>{selectedPatient?.name}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="calendar" size={16} color="#0A7B6E" />
                <Text style={styles.summaryText}>{formatDateDisplay(selectedDate!)} at {selectedTime}</Text>
              </View>
              <TouchableOpacity style={styles.changeLink} onPress={() => setStep(3)}>
                <Text style={styles.changeLinkText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Appointment Type */}
            <Text style={styles.sectionLabel}>APPOINTMENT TYPE</Text>
            <View style={styles.typeRow}>
              {APPOINTMENT_TYPES.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeChip, appointmentType === type.id && styles.typeChipActive]}
                  onPress={() => setAppointmentType(type.id)}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={16} 
                    color={appointmentType === type.id ? '#FFFFFF' : '#0A7B6E'} 
                  />
                  <Text style={[styles.typeChipText, appointmentType === type.id && styles.typeChipTextActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chief Complaint */}
            <Text style={styles.sectionLabel}>CHIEF COMPLAINT</Text>
            <TextInput
              style={styles.input}
              placeholder="Reason for visit..."
              value={chiefComplaint}
              onChangeText={setChiefComplaint}
            />

            {/* Notes */}
            <Text style={styles.sectionLabel}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
            />

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
                  <Text style={styles.saveBtnText}>Schedule Appointment</Text>
                </>
              )}
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
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7C93' },
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
  stepTitle: { fontSize: 22, fontWeight: '600', color: '#0D1B2A', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: '#6B7C93', marginBottom: 20 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E6F5F3', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#B2DED9' },
  lockedBadgeText: { flex: 1, fontSize: 14, color: '#0A7B6E', fontWeight: '500' },
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
  noResults: { textAlign: 'center', color: '#6B7C93', marginTop: 20 },
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
  bookedLabel: { fontSize: 9, color: '#DC2626', marginTop: 2 },
  noSlotsContainer: { alignItems: 'center', paddingVertical: 40 },
  noSlotsText: { fontSize: 15, color: '#6B7C93', marginTop: 12 },
  noSlotsHint: { fontSize: 13, color: '#6B7C93', marginTop: 4 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  summaryText: { fontSize: 15, color: '#0D1B2A' },
  changeLink: { alignSelf: 'flex-end', marginTop: 4 },
  changeLinkText: { fontSize: 13, color: '#0A7B6E', fontWeight: '500' },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  typeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#0A7B6E' },
  typeChipActive: { backgroundColor: '#0A7B6E' },
  typeChipText: { fontSize: 13, fontWeight: '500', color: '#0A7B6E' },
  typeChipTextActive: { color: '#FFFFFF' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE4ED', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A7B6E', paddingVertical: 16, borderRadius: 14, marginTop: 20, gap: 8, shadowColor: '#0A7B6E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
