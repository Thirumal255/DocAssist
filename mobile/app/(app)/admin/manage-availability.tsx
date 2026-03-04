import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, BackHandler } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { availabilityApi, usersApi, AvailabilitySlot } from '../../../api';
import { log } from '../../../utils/logger';

const MODULE = 'ManageAvailability';

const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', short: 'Sun' },
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

interface Doctor {
  id: string;
  name: string;
  specialty?: string;
  availability: any[];
}

interface TimeSlotInput {
  id: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlotInput[];
}

export default function ManageAvailabilityScreen() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [schedules, setSchedules] = useState<Record<number, DaySchedule>>(() => {
    const initial: Record<number, DaySchedule> = {};
    DAYS_OF_WEEK.forEach(day => {
      initial[day.id] = { enabled: false, slots: [] };
    });
    return initial;
  });
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // FIX 1: Reset state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setSelectedDoctor(null); 
      loadDoctors();
      return () => {};
    }, [])
  );

  // FIX 2: Handle Hardware Back Button (Android) - CORRECTED
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (selectedDoctor) {
          setSelectedDoctor(null); // Go back to list view
          return true; // Prevent default behavior (exiting screen)
        }
        return false; // Let default behavior happen (exit screen)
      };

      // The modern way to add listener
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      // Cleanup using subscription.remove()
      return () => subscription.remove();
    }, [selectedDoctor])
  );

  const loadDoctors = async () => {
    try {
      const result = await availabilityApi.getAllDoctors();
      if (result.data) {
        setDoctors(result.data);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load doctors', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    
    // Load doctor's availability into schedule state
    const newSchedules: Record<number, DaySchedule> = {};
    DAYS_OF_WEEK.forEach(day => {
      newSchedules[day.id] = { enabled: false, slots: [] };
    });

    doctor.availability.forEach((slot: any) => {
      if (!newSchedules[slot.dayOfWeek]) {
        newSchedules[slot.dayOfWeek] = { enabled: false, slots: [] };
      }
      newSchedules[slot.dayOfWeek].enabled = true;
      newSchedules[slot.dayOfWeek].slots.push({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotDuration: slot.slotDuration || 15,
      });
    });

    setSchedules(newSchedules);
    setExpandedDay(null);
  };

  const toggleDay = (dayId: number) => {
    setSchedules(prev => {
      const current = prev[dayId];
      const newEnabled = !current.enabled;
      return {
        ...prev,
        [dayId]: {
          enabled: newEnabled,
          slots: newEnabled && current.slots.length === 0 
            ? [{ id: `new-${Date.now()}`, startTime: '09:00', endTime: '17:00', slotDuration: 15 }]
            : current.slots
        }
      };
    });
  };

  const addSlot = (dayId: number) => {
    setSchedules(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        slots: [
          ...prev[dayId].slots,
          { id: `new-${Date.now()}`, startTime: '17:00', endTime: '20:00', slotDuration: 15 }
        ]
      }
    }));
  };

  const updateSlot = (dayId: number, slotIndex: number, field: keyof TimeSlotInput, value: string | number) => {
    setSchedules(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        slots: prev[dayId].slots.map((slot, i) => 
          i === slotIndex ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  const removeSlot = (dayId: number, slotIndex: number) => {
    setSchedules(prev => {
      const newSlots = prev[dayId].slots.filter((_, i) => i !== slotIndex);
      return {
        ...prev,
        [dayId]: {
          enabled: newSlots.length > 0,
          slots: newSlots
        }
      };
    });
  };

  const handleSave = async () => {
    if (!selectedDoctor) return;
    
    setIsSaving(true);
    log.info(MODULE, `Saving availability for ${selectedDoctor.name}`);

    try {
      const slots: AvailabilitySlot[] = [];
      
      Object.entries(schedules).forEach(([dayStr, schedule]) => {
        if (schedule.enabled && schedule.slots.length > 0) {
          schedule.slots.forEach(slot => {
            if (slot.startTime && slot.endTime && slot.startTime < slot.endTime) {
              slots.push({
                dayOfWeek: parseInt(dayStr),
                startTime: slot.startTime,
                endTime: slot.endTime,
                slotDuration: slot.slotDuration || 15,
              });
            }
          });
        }
      });

      const result = await availabilityApi.replaceAll(selectedDoctor.id, slots);
      
      if (result.data) {
        log.info(MODULE, `Saved ${slots.length} slots`);
        Alert.alert(
          'Success', 
          `Availability saved for ${selectedDoctor.name}`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                 setSelectedDoctor(null);
                 loadDoctors();
              } 
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save');
      }
    } catch (error) {
      log.error(MODULE, 'Save failed', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const getAvailabilitySummary = (doctor: Doctor) => {
    if (!doctor.availability || doctor.availability.length === 0) {
      return 'No availability set';
    }
    const days = [...new Set(doctor.availability.map((a: any) => a.dayOfWeek))].sort();
    const dayNames = days.map(d => DAYS_OF_WEEK[d].short);
    return dayNames.join(', ');
  };

  const handleBack = () => {
    if (selectedDoctor) {
      setSelectedDoctor(null); 
    } else {
      router.back();
    }
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedDoctor ? selectedDoctor.name : 'Manage Availability'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!selectedDoctor ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Doctor</Text>
            <Text style={styles.sectionSubtitle}>Choose a doctor to manage their schedule</Text>
            
            {doctors.map(doctor => (
              <TouchableOpacity
                key={doctor.id}
                style={styles.doctorCard}
                onPress={() => selectDoctor(doctor)}
              >
                <View style={styles.doctorIcon}>
                  <Ionicons name="medical" size={22} color="#0A7B6E" />
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <Text style={styles.doctorSpecialty}>{doctor.specialty || 'General Medicine'}</Text>
                  <Text style={styles.doctorAvailability}>{getAvailabilitySummary(doctor)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7C93" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.selectedDoctorCard} onPress={() => setSelectedDoctor(null)}>
              <View style={styles.doctorIcon}>
                <Ionicons name="medical" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.selectedDoctorName}>{selectedDoctor.name}</Text>
                <Text style={styles.selectedDoctorSpecialty}>{selectedDoctor.specialty || 'General Medicine'}</Text>
              </View>
              <View style={styles.changeBtn}>
                <Text style={styles.changeBtnText}>Change</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.instructions}>
              Set clinic timings. Patients will only be able to book appointments during these hours. 
              Each appointment slot is 15 minutes.
            </Text>

            {DAYS_OF_WEEK.map(day => {
              const schedule = schedules[day.id];
              const isExpanded = expandedDay === day.id;
              
              return (
                <View key={day.id} style={[styles.dayCard, schedule.enabled && styles.dayCardActive]}>
                  <TouchableOpacity 
                    style={styles.dayHeader}
                    onPress={() => setExpandedDay(isExpanded ? null : day.id)}
                  >
                    <TouchableOpacity 
                      style={[styles.checkbox, schedule.enabled && styles.checkboxActive]}
                      onPress={() => toggleDay(day.id)}
                    >
                      {schedule.enabled && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                    
                    <View style={styles.dayInfo}>
                      <Text style={[styles.dayName, !schedule.enabled && styles.dayNameDisabled]}>{day.name}</Text>
                      {schedule.enabled && schedule.slots.length > 0 && (
                        <Text style={styles.daySummary}>
                          {schedule.slots.map(s => `${s.startTime}-${s.endTime}`).join(', ')}
                        </Text>
                      )}
                    </View>

                    {schedule.enabled && (
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7C93" />
                    )}
                  </TouchableOpacity>

                  {isExpanded && schedule.enabled && (
                    <View style={styles.dayDetails}>
                      {schedule.slots.map((slot, index) => (
                        <View key={slot.id} style={styles.slotRow}>
                          <View style={styles.slotInputs}>
                            <View style={styles.timeInput}>
                              <Text style={styles.inputLabel}>From</Text>
                              <TextInput
                                style={styles.input}
                                value={slot.startTime}
                                onChangeText={(v) => updateSlot(day.id, index, 'startTime', v)}
                                placeholder="09:00"
                              />
                            </View>
                            <View style={styles.timeInput}>
                              <Text style={styles.inputLabel}>To</Text>
                              <TextInput
                                style={styles.input}
                                value={slot.endTime}
                                onChangeText={(v) => updateSlot(day.id, index, 'endTime', v)}
                                placeholder="17:00"
                              />
                            </View>
                          </View>
                          
                          {schedule.slots.length > 1 && (
                            <TouchableOpacity 
                              style={styles.removeBtn}
                              onPress={() => removeSlot(day.id, index)}
                            >
                              <Ionicons name="trash-outline" size={18} color="#DC2626" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      
                      <TouchableOpacity style={styles.addSlotBtn} onPress={() => addSlot(day.id)}>
                        <Ionicons name="add-circle-outline" size={18} color="#0A7B6E" />
                        <Text style={styles.addSlotText}>Add Evening/Another Slot</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

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
                  <Text style={styles.saveBtnText}>Save Availability</Text>
                </>
              )}
            </TouchableOpacity>
          </>
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
  content: { flex: 1, padding: 16 },
  section: {},
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#0D1B2A', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#6B7C93', marginBottom: 20 },
  doctorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  doctorIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#E6F5F3', alignItems: 'center', justifyContent: 'center' },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  doctorSpecialty: { fontSize: 13, color: '#6B7C93', marginTop: 2 },
  doctorAvailability: { fontSize: 12, color: '#0A7B6E', marginTop: 4 },
  selectedDoctorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A7B6E', borderRadius: 14, padding: 14, marginBottom: 16, gap: 14 },
  selectedDoctorName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  selectedDoctorSpecialty: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  changeBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  changeBtnText: { fontSize: 12, color: '#FFFFFF', fontWeight: '500' },
  instructions: { fontSize: 13, color: '#6B7C93', marginBottom: 20, lineHeight: 20 },
  dayCard: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  dayCardActive: { borderWidth: 1, borderColor: '#B2DED9' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#DCE4ED', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#0A7B6E', borderColor: '#0A7B6E' },
  dayInfo: { flex: 1 },
  dayName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  dayNameDisabled: { color: '#6B7C93' },
  daySummary: { fontSize: 12, color: '#0A7B6E', marginTop: 2 },
  dayDetails: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#F5F8FA' },
  slotRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
  slotInputs: { flex: 1, flexDirection: 'row', gap: 8 },
  timeInput: { flex: 1 },
  inputLabel: { fontSize: 10, fontWeight: '600', color: '#6B7C93', marginBottom: 4 },
  input: { backgroundColor: '#F5F8FA', borderWidth: 1, borderColor: '#DCE4ED', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, textAlign: 'center' },
  removeBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  addSlotBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 12, backgroundColor: '#E6F5F3', borderRadius: 8 },
  addSlotText: { fontSize: 13, color: '#0A7B6E', fontWeight: '500' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A7B6E', paddingVertical: 16, borderRadius: 14, marginTop: 20, gap: 8, shadowColor: '#0A7B6E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});