import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appointmentsApi } from '../../api';
import { useAuthStore } from '../../store';
import { Appointment, DashboardStats } from '../../types';
import { log } from '../../utils/logger';

const MODULE = 'Dashboard';

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor';
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      log.screen(MODULE, 'focus');
      loadData();
    }, [])
  );

  const loadData = async () => {
    log.info(MODULE, 'Loading dashboard data');
    try {
      const [statsResult, appointmentsResult] = await Promise.all([
        appointmentsApi.getStats(),
        appointmentsApi.getToday()
      ]);
      
      if (statsResult.data) {
        setStats(statsResult.data);
      }
      if (appointmentsResult.data) {
        setTodayAppointments(appointmentsResult.data);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load dashboard', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Quick actions based on role
  const quickActions = isAdmin ? [
    { id: 'appointment', icon: 'calendar', label: 'New Appointment', color: '#E6F5F3', route: '/(app)/appointments/new' },
    { id: 'patient', icon: 'person-add', label: 'Add Patient', color: '#EEF2FF', route: '/(app)/patients/add' },
    { id: 'users', icon: 'people', label: 'Manage Users', color: '#FEF3C7', route: '/(app)/admin/users' },
    { id: 'availability', icon: 'time', label: 'Availability', color: '#FCE7F3', route: '/(app)/admin/manage-availability' },
  ] : [
    { id: 'appointment', icon: 'calendar', label: 'New Appointment', color: '#E6F5F3', route: '/(app)/appointments/new' },
    { id: 'patient', icon: 'person-add', label: 'Add Patient', color: '#EEF2FF', route: '/(app)/patients/add' },
    { id: 'prescription', icon: 'document-text', label: 'Write Rx', color: '#FEF3C7', route: '/(app)/prescriptions/new' },
    { id: 'reports', icon: 'stats-chart', label: 'Reports', color: '#FCE7F3', route: '/(app)/reports' },
  ];

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadData(); }} colors={['#0A7B6E']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()} 🌤</Text>
              <Text style={styles.userName}>{user?.name}</Text>
            </View>
            <TouchableOpacity style={styles.avatar} onPress={() => router.push('/(app)/settings')}>
              <Text style={styles.avatarText}>
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{stats?.todayAppointments || 0}</Text>
              <Text style={styles.statLabel}>Today's Appts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{stats?.pendingAppointments || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{stats?.totalCancelled || 0}</Text>
              <Text style={styles.statLabel}>Cancelled</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {quickActions.map(action => (
              <TouchableOpacity 
                key={action.id} 
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon as any} size={20} color="#0A7B6E" />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's Queue */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Queue</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/appointments')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {todayAppointments.length === 0 ? (
            <View style={styles.emptyQueue}>
              <Ionicons name="calendar-outline" size={40} color="#6B7C93" />
              <Text style={styles.emptyText}>No appointments today</Text>
            </View>
          ) : (
            todayAppointments.slice(0, 5).map(appt => (
              <TouchableOpacity 
                key={appt.id} 
                style={styles.appointmentCard}
                onPress={() => router.push(`/(app)/patients/${appt.patientId}`)}
              >
                <View style={styles.apptTime}>
                  <Text style={styles.apptTimeText}>{formatTime(appt.scheduledAt)}</Text>
                </View>
                <View style={styles.apptInfo}>
                  <Text style={styles.apptName}>{appt.patient?.name}</Text>
                  <Text style={styles.apptType}>{appt.chiefComplaint || 'General consultation'}</Text>
                  {appt.doctor?.name && (
                    <Text style={styles.doctorName}>👨‍⚕️ {appt.doctor.name}</Text>
                  )}
                </View>
                <View style={[styles.apptBadge, appt.type === 'new_visit' ? styles.badgeNew : styles.badgeFollow]}>
                  <Text style={[styles.apptBadgeText, appt.type === 'new_visit' ? styles.badgeNewText : styles.badgeFollowText]}>
                    {appt.type === 'new_visit' ? 'New' : 'Follow-up'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#0A7B6E', paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 8 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  userName: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#0FA68E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  seeAll: { fontSize: 13, color: '#0A7B6E', fontWeight: '500' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#2C3E50', flex: 1 },
  emptyQueue: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#FFFFFF', borderRadius: 14 },
  emptyText: { fontSize: 14, color: '#6B7C93', marginTop: 8 },
  appointmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  apptTime: { backgroundColor: '#E6F5F3', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  apptTimeText: { fontSize: 12, fontWeight: '600', color: '#0A7B6E' },
  apptInfo: { flex: 1, marginLeft: 12 },
  apptName: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  apptType: { fontSize: 12, color: '#6B7C93', marginTop: 2 },
  doctorName: { fontSize: 11, color: '#0A7B6E', marginTop: 4, fontWeight: '500' },
  apptBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeNew: { backgroundColor: '#FEF3C7' },
  badgeFollow: { backgroundColor: '#E0F2FE' },
  apptBadgeText: { fontSize: 11, fontWeight: '600' },
  badgeNewText: { color: '#92400E' },
  badgeFollowText: { color: '#0369A1' },
});
