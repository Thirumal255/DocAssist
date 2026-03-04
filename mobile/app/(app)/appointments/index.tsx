import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appointmentsApi, usersApi, availabilityApi } from '../../../api';
import { useAuthStore } from '../../../store';
import { log } from '../../../utils/logger';

const MODULE = 'AppointmentsList';

interface Doctor {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  patientId: string;
  patient: { id: string; name: string; phone: string };
  doctorId: string;
  doctor: { id: string; name: string };
  scheduledAt: string;
  status: string;
  type: string;
  chiefComplaint?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// SIMPLIFIED STATUS CONFIG
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  // Lowercase matches
  scheduled: { color: '#0A7B6E', bg: '#E6F5F3', label: 'Scheduled' },
  completed: { color: '#16A34A', bg: '#D1FAE5', label: 'Completed' },
  cancelled: { color: '#DC2626', bg: '#FEE2E2', label: 'Cancelled' },
  // Uppercase matches (Prisma Enum)
  SCHEDULED: { color: '#0A7B6E', bg: '#E6F5F3', label: 'Scheduled' },
  COMPLETED: { color: '#16A34A', bg: '#D1FAE5', label: 'Completed' },
  CANCELLED: { color: '#DC2626', bg: '#FEE2E2', label: 'Cancelled' },
};

const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const formatDateShort = (date: Date) => {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function AppointmentsScreen() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useFocusEffect(
    useCallback(() => {
      log.screen(MODULE, 'focus - resetting filters');
      const today = new Date();
      setSelectedDate(today);
      setSelectedDoctor('all');
      setSelectedAppointment(null);
      closeAllModals();
      loadDoctors();
      loadAppointmentsForDate(today, 'all');
      return () => {};
    }, [])
  );

  useEffect(() => {
    if (showRescheduleModal && selectedAppointment) {
      const dates: Date[] = [];
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date);
      }
      setAvailableDates(dates);
      setRescheduleDate(null);
      setRescheduleTime(null);
      setTimeSlots([]);
    }
  }, [showRescheduleModal, selectedAppointment]);

  useEffect(() => {
    if (rescheduleDate && selectedAppointment) {
      loadRescheduleSlots();
    }
  }, [rescheduleDate]);

  const loadDoctors = async () => {
    if (!isAdmin) return;
    try {
      const result = await usersApi.getDoctors();
      if (result.data) setDoctors(result.data);
    } catch (error) {
      log.error(MODULE, 'Failed to load doctors', error);
    }
  };

  const loadAppointmentsForDate = async (date: Date, doctorFilter: string) => {
    setIsLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const result = await appointmentsApi.getAll(dateStr, isAdmin && doctorFilter !== 'all' ? doctorFilter : undefined);
      if (result.data) setAppointments(result.data);
    } catch (error) {
      log.error(MODULE, 'Failed to load appointments', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    loadAppointmentsForDate(newDate, selectedDoctor);
  };

  const handleDoctorChange = (doctorId: string) => {
    setSelectedDoctor(doctorId);
    loadAppointmentsForDate(selectedDate, doctorId);
  };

  const loadRescheduleSlots = async () => {
    if (!rescheduleDate || !selectedAppointment) return;
    setIsLoadingSlots(true);
    setRescheduleTime(null);
    try {
      const dateStr = rescheduleDate.toISOString().split('T')[0];
      const result = await availabilityApi.getSlots(selectedAppointment.doctorId, dateStr, selectedAppointment.id);
      if (result.data?.available) setTimeSlots(result.data.slots || []);
      else setTimeSlots([]);
    } catch (error) {
      log.error(MODULE, 'Failed to load slots', error);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // --- 1. Mark as Completed ---
  const handleMarkCompleted = async () => {
    if (!selectedAppointment) return;
    setIsProcessing(true);
    try {
      const result = await appointmentsApi.updateStatus(selectedAppointment.id, 'COMPLETED');
      if (result.data) {
        Alert.alert('Success', 'Appointment marked as completed');
        closeAllModals();
        loadAppointmentsForDate(selectedDate, selectedDoctor);
      } else {
        Alert.alert('Error', result.error || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 2. Quick No Show (Cancels with reason) ---
  const handleMarkNoShow = async () => {
    if (!selectedAppointment) return;
    setIsProcessing(true);
    try {
      const result = await appointmentsApi.cancel(selectedAppointment.id, "Patient No Show");
      if (result.data) {
        Alert.alert('Success', 'Marked as No Show');
        closeAllModals();
        loadAppointmentsForDate(selectedDate, selectedDoctor);
      } else {
        Alert.alert('Error', result.error || 'Failed to update');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 3. Custom Cancel ---
  const handleCancel = async () => {
    if (!selectedAppointment) return;
    setIsProcessing(true);
    try {
      const result = await appointmentsApi.cancel(selectedAppointment.id, cancelReason);
      if (result.data) {
        Alert.alert('Success', 'Appointment cancelled');
        closeAllModals();
        loadAppointmentsForDate(selectedDate, selectedDoctor);
      } else Alert.alert('Error', result.error || 'Failed to cancel');
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) {
      Alert.alert('Error', 'Please select date and time');
      return;
    }
    setIsProcessing(true);
    const newDateTime = new Date(rescheduleDate);
    const [hours, minutes] = rescheduleTime.split(':').map(Number);
    newDateTime.setHours(hours, minutes, 0, 0);
    try {
      const result = await appointmentsApi.reschedule(selectedAppointment.id, newDateTime.toISOString(), rescheduleReason);
      if (result.data) {
        Alert.alert('Success', 'Appointment rescheduled');
        closeAllModals();
        loadAppointmentsForDate(selectedDate, selectedDoctor);
      } else Alert.alert('Error', result.error || 'Failed to reschedule');
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  const closeAllModals = () => {
    setShowActionModal(false);
    setShowCancelModal(false);
    setShowRescheduleModal(false);
    setCancelReason('');
    setRescheduleReason('');
    setRescheduleDate(null);
    setRescheduleTime(null);
    setTimeSlots([]);
    setSelectedAppointment(null);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    handleDateChange(newDate);
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const statusKey = item.status; // No need to lowercase if Backend sends uppercase
    const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.SCHEDULED;
    const isCompletedOrCancelled = ['COMPLETED', 'CANCELLED'].includes(item.status);
    
    return (
      <TouchableOpacity style={styles.card} onPress={() => { setSelectedAppointment(item); setShowActionModal(true); }}>
        <View style={styles.timeCol}>
          <Text style={styles.time}>{formatTime(item.scheduledAt)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.patientName}>{item.patient.name}</Text>
          <Text style={styles.complaint}>{item.chiefComplaint || 'General consultation'}</Text>
          {isAdmin && (
            <View style={styles.doctorRow}>
              <Ionicons name="medical" size={12} color="#6B7C93" />
              <Text style={styles.doctorName}>{item.doctor.name}</Text>
            </View>
          )}
        </View>
        <View style={styles.actionCol}>
          <View style={[styles.typeBadge, item.type === 'new_visit' ? styles.newBadge : styles.followBadge]}>
            <Text style={[styles.typeText, item.type === 'new_visit' ? styles.newText : styles.followText]}>
              {item.type === 'new_visit' ? 'New' : 'Follow-up'}
            </Text>
          </View>
          {!isCompletedOrCancelled && <Ionicons name="ellipsis-vertical" size={18} color="#6B7C93" style={{ marginTop: 8 }} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(app)/appointments/new')}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
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

      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(-1)}>
          <Ionicons name="chevron-back" size={20} color="#0A7B6E" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateDisplay} onPress={() => handleDateChange(new Date())}>
          <Ionicons name="calendar" size={16} color="#0A7B6E" />
          <Text style={styles.dateText}>{formatDateShort(selectedDate)}</Text>
          <Text style={styles.dateFullText}>{formatDate(selectedDate.toISOString())}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(1)}>
          <Ionicons name="chevron-forward" size={20} color="#0A7B6E" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0A7B6E" /></View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id}
          renderItem={renderAppointment}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={() => { setIsRefreshing(true); loadAppointmentsForDate(selectedDate, selectedDoctor); }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#6B7C93" />
              <Text style={styles.emptyText}>No appointments for this day</Text>
            </View>
          }
        />
      )}

      {/* Action Modal */}
      <Modal visible={showActionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Actions</Text>
              <TouchableOpacity onPress={closeAllModals}><Ionicons name="close" size={24} color="#2C3E50" /></TouchableOpacity>
            </View>
            {selectedAppointment && (
              <>
                <View style={styles.summary}>
                  <View style={styles.summaryRow}><Ionicons name="person" size={16} color="#0A7B6E" /><Text style={styles.summaryValue}>{selectedAppointment.patient.name}</Text></View>
                  <View style={styles.summaryRow}><Ionicons name="time" size={16} color="#0A7B6E" /><Text style={styles.summaryValue}>{formatTime(selectedAppointment.scheduledAt)}</Text></View>
                </View>
                
                {/* --- SIMPLIFIED ACTIONS --- */}
                {!['COMPLETED', 'CANCELLED'].includes(selectedAppointment.status) && (
                  <View style={{ gap: 12 }}>
                    
                    {/* 1. Mark as Completed */}
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#D1FAE5', borderColor: '#16A34A', borderWidth: 1 }]} 
                      onPress={handleMarkCompleted} disabled={isProcessing}>
                      <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                      <Text style={[styles.actionButtonText, { color: '#166534' }]}>Mark as Completed</Text>
                    </TouchableOpacity>

                    <View style={styles.actionButtons}>
                      {/* Reschedule */}
                      <TouchableOpacity style={styles.actionButton} onPress={() => { setShowActionModal(false); setShowRescheduleModal(true); }}>
                        <Ionicons name="calendar" size={20} color="#0A7B6E" /><Text style={styles.actionButtonText}>Reschedule</Text>
                      </TouchableOpacity>
                      
                      {/* No Show (Quick Cancel) */}
                      <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#F3F4F6' }]} onPress={handleMarkNoShow} disabled={isProcessing}>
                        <Ionicons name="eye-off" size={20} color="#6B7280" />
                        <Text style={[styles.actionButtonText, { color: '#4B5563' }]}>No Show</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Cancel (Custom Reason) */}
                    <TouchableOpacity style={[styles.actionButton, styles.cancelBtn]} onPress={() => { setShowActionModal(false); setShowCancelModal(true); }}>
                      <Ionicons name="close-circle" size={20} color="#DC2626" /><Text style={[styles.actionButtonText, { color: '#DC2626' }]}>Cancel Appointment</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {/* ----------------------------- */}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Appointment</Text>
            <Text style={styles.modalSubtitle}>Cancel {selectedAppointment?.patient.name}'s appointment?</Text>
            <Text style={styles.inputLabel}>Reason (optional)</Text>
            <TextInput style={styles.reasonInput} placeholder="Enter reason..." value={cancelReason} onChangeText={setCancelReason} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowCancelModal(false); setShowActionModal(true); }}><Text style={styles.modalCancelText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: '#DC2626' }]} onPress={handleCancel} disabled={isProcessing}>
                {isProcessing ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalConfirmText}>Cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={showRescheduleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule</Text>
              <TouchableOpacity onPress={closeAllModals}><Ionicons name="close" size={24} color="#2C3E50" /></TouchableOpacity>
            </View>
            {selectedAppointment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.currentInfo}>
                  <Text style={styles.infoLabel}>Patient: <Text style={styles.infoValue}>{selectedAppointment.patient.name}</Text></Text>
                  <Text style={styles.infoLabel}>Doctor: <Text style={styles.infoValue}>{selectedAppointment.doctor.name}</Text></Text>
                  <Text style={styles.infoLabel}>Current: <Text style={styles.infoHighlight}>{formatDate(selectedAppointment.scheduledAt)} at {formatTime(selectedAppointment.scheduledAt)}</Text></Text>
                </View>
                <Text style={styles.sectionLabel}>SELECT NEW DATE</Text>
                <FlatList horizontal showsHorizontalScrollIndicator={false} data={availableDates} keyExtractor={item => item.toISOString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.dateChip, rescheduleDate?.toDateString() === item.toDateString() && styles.dateChipActive]} onPress={() => setRescheduleDate(item)}>
                      <Text style={[styles.dateChipDay, rescheduleDate?.toDateString() === item.toDateString() && styles.dateChipTextActive]}>{item.toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
                      <Text style={[styles.dateChipNum, rescheduleDate?.toDateString() === item.toDateString() && styles.dateChipTextActive]}>{item.getDate()}</Text>
                    </TouchableOpacity>
                  )}
                  style={{ marginBottom: 16 }}
                />
                {rescheduleDate && (
                  <>
                    <Text style={styles.sectionLabel}>SELECT NEW TIME</Text>
                    {isLoadingSlots ? <ActivityIndicator color="#0A7B6E" style={{ marginVertical: 20 }} /> : timeSlots.length > 0 ? (
                      <View style={styles.slotsGrid}>
                        {timeSlots.map(slot => (
                          <TouchableOpacity key={slot.time} style={[styles.timeSlot, rescheduleTime === slot.time && styles.timeSlotActive, !slot.available && styles.timeSlotDisabled]} onPress={() => slot.available && setRescheduleTime(slot.time)} disabled={!slot.available}>
                            <Text style={[styles.timeSlotText, rescheduleTime === slot.time && styles.timeSlotTextActive, !slot.available && styles.timeSlotTextDisabled]}>{slot.time}</Text>
                            {!slot.available && <Text style={styles.bookedLabel}>Booked</Text>}
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.noSlots}><Ionicons name="calendar-outline" size={32} color="#6B7C93" /><Text style={styles.noSlotsText}>Not available</Text></View>
                    )}
                  </>
                )}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>REASON (OPTIONAL)</Text>
                <TextInput style={styles.reasonInput} placeholder="Reason..." value={rescheduleReason} onChangeText={setRescheduleReason} multiline />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowRescheduleModal(false); setShowActionModal(true); }}><Text style={styles.modalCancelText}>Back</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.modalConfirmBtn, (!rescheduleDate || !rescheduleTime) && { opacity: 0.5 }]} onPress={handleReschedule} disabled={isProcessing || !rescheduleDate || !rescheduleTime}>
                    {isProcessing ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalConfirmText}>Reschedule</Text>}
                  </TouchableOpacity>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#DCE4ED' },
  headerTitle: { fontSize: 24, fontWeight: '600', color: '#0D1B2A' },
  addBtn: { width: 40, height: 40, backgroundColor: '#0A7B6E', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#DCE4ED' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#2C3E50', marginRight: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#F5F8FA', borderRadius: 20, marginRight: 8 },
  chipActive: { backgroundColor: '#0A7B6E' },
  chipText: { fontSize: 13, color: '#2C3E50' },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: '#FFF', gap: 16 },
  dateNavBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E6F5F3', alignItems: 'center', justifyContent: 'center' },
  dateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 18, fontWeight: '600', color: '#0D1B2A' },
  dateFullText: { fontSize: 13, color: '#6B7C93' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 12 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  timeCol: { marginRight: 14, alignItems: 'center', minWidth: 70 },
  time: { fontSize: 14, fontWeight: '700', color: '#0A7B6E' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 6 },
  statusText: { fontSize: 9, fontWeight: '600' },
  infoCol: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  complaint: { fontSize: 13, color: '#6B7C93', marginTop: 2 },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  doctorName: { fontSize: 11, color: '#6B7C93' },
  actionCol: { alignItems: 'flex-end', justifyContent: 'space-between' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  newBadge: { backgroundColor: '#FEF3C7' },
  followBadge: { backgroundColor: '#E0F2FE' },
  typeText: { fontSize: 11, fontWeight: '600' },
  newText: { color: '#92400E' },
  followText: { color: '#0369A1' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: '#6B7C93', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#0D1B2A' },
  modalSubtitle: { fontSize: 14, color: '#6B7C93', marginBottom: 16 },
  summary: { backgroundColor: '#F5F8FA', borderRadius: 12, padding: 14, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  summaryValue: { fontSize: 14, color: '#0D1B2A', fontWeight: '500', flex: 1 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#E6F5F3', borderRadius: 12 },
  cancelBtn: { backgroundColor: '#FEE2E2' },
  actionButtonText: { fontSize: 15, fontWeight: '600', color: '#0A7B6E' },
  currentInfo: { backgroundColor: '#F5F8FA', borderRadius: 12, padding: 14, marginBottom: 16 },
  infoLabel: { fontSize: 13, color: '#6B7C93', marginBottom: 6 },
  infoValue: { fontWeight: '600', color: '#0D1B2A' },
  infoHighlight: { fontWeight: '600', color: '#0A7B6E' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6B7C93', letterSpacing: 0.5, marginBottom: 10 },
  dateChip: { width: 54, height: 68, backgroundColor: '#F5F8FA', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dateChipActive: { backgroundColor: '#0A7B6E' },
  dateChipDay: { fontSize: 11, color: '#6B7C93' },
  dateChipNum: { fontSize: 20, fontWeight: '700', color: '#0D1B2A', marginTop: 2 },
  dateChipTextActive: { color: '#FFF' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#DCE4ED', minWidth: 70, alignItems: 'center' },
  timeSlotActive: { backgroundColor: '#0A7B6E', borderColor: '#0A7B6E' },
  timeSlotDisabled: { backgroundColor: '#F5F8FA' },
  timeSlotText: { fontSize: 13, fontWeight: '500', color: '#0D1B2A' },
  timeSlotTextActive: { color: '#FFF' },
  timeSlotTextDisabled: { color: '#6B7C93' },
  bookedLabel: { fontSize: 9, color: '#DC2626', marginTop: 2 },
  noSlots: { alignItems: 'center', paddingVertical: 20 },
  noSlotsText: { fontSize: 13, color: '#6B7C93', marginTop: 8 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#2C3E50', marginBottom: 6 },
  reasonInput: { backgroundColor: '#F5F8FA', borderWidth: 1, borderColor: '#DCE4ED', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 70, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F5F8FA', alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#2C3E50' },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#0A7B6E', alignItems: 'center' },
  modalConfirmText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
});