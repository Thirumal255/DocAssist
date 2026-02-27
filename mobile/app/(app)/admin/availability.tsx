import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { availabilityApi, usersApi, AvailabilitySlot } from '../../../api';
import { useAuthStore } from '../../../store';
import { log } from '../../../utils/logger';

const MODULE = 'DoctorAvailability';

const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', short: 'Sun' },
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

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

export default function DoctorAvailabilityScreen() {
  const { doctorId } = useLocalSearchParams<{ doctorId?: string }>();
  const { user } = useAuthStore();
  
  const targetDoctorId = doctorId || user?.id;
  const isOwnSchedule = targetDoctorId === user?.id;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [schedules, setSchedules] = useState<Record<number, DaySchedule>>(() => {
    const initial: Record<number, DaySchedule> = {};
    DAYS_OF_WEEK.forEach(day => {
      initial[day.id] = { enabled: false, slots: [] };
    });
    return initial;
  });
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    log.screen(MODULE, 'mount');
    loadData();
  }, [targetDoctorId]);

  const loadData = async () => {
    if (!targetDoctorId) return;
    
    try {
      // Load doctor info if not own schedule
      if (!isOwnSchedule) {
        const userResult = await usersApi.getById(targetDoctorId);
        if (userResult.data) {
          setDoctorName(userResult.data.name);
        }
      }

      // Load availability
      const result = await availabilityApi.getByDoctor(targetDoctorId);
      if (result.data) {
        const newSchedules: Record<number, DaySchedule> = {};
        DAYS_OF_WEEK.forEach(day => {
          newSchedules[day.id] = { enabled: false, slots: [] };
        });

        result.data.forEach((slot: any) => {
          if (!newSchedules[slot.dayOfWeek]) {
            newSchedules[slot.dayOfWeek] = { enabled: false, slots: [] };
          }
          newSchedules[slot.dayOfWeek].enabled = true;
          newSchedules[slot.dayOfWeek].slots.push({
            id: slot.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            slotDuration: slot.slotDuration,
          });
        });

        setSchedules(newSchedules);
        log.info(MODULE, 'Availability loaded');
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load data', error);
    } finally {
      setIsLoading(false);
    }
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
            ? [{ id: `new-${Date.now()}`, startTime: '09:00', endTime: '17:00', slotDuration: 30 }]
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
          { id: `new-${Date.now()}`, startTime: '17:00', endTime: '20:00', slotDuration: 30 }
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
    if (!targetDoctorId) return;
    
    setIsSaving(true);
    log.info(MODULE, 'Saving availability');

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
                slotDuration: slot.slotDuration || 30,
              });
            }
          });
        }
      });

      const result = await availabilityApi.replaceAll(targetDoctorId, slots);
      
      if (result.data) {
        log.info(MODULE, `Saved ${slots.length} slots`);
        Alert.alert('Success', 'Availability saved successfully');
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0D1B2A" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Availability</Text>
          {!isOwnSchedule && <Text style={styles.headerSubtitle}>{doctorName}</Text>}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.instructions}>
          Set clinic visit timings. Multiple time slots per day are supported (e.g., Morning 9-1 PM and Evening 5-8 PM).
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
                        <View style={styles.timeInput}>
                          <Text style={styles.inputLabel}>Slot (min)</Text>
                          <TextInput
                            style={styles.input}
                            value={String(slot.slotDuration)}
                            onChangeText={(v) => updateSlot(day.id, index, 'slotDuration', parseInt(v) || 30)}
                            keyboardType="numeric"
                            placeholder="30"
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
                    <Text style={styles.addSlotText}>Add Another Time Slot</Text>
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
  headerSubtitle: { fontSize: 12, color: '#6B7C93' },
  content: { flex: 1, padding: 16 },
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
