import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, BorderRadius, Typography, Spacing, Shadows } from '../../constants';
import { useAuthStore } from '../../store';
import { log } from '../../utils/logger';

const MODULE = 'Settings';

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  onPress: () => void;
  role?: 'admin' | 'doctor' | 'all';
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor';

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            log.action(MODULE, 'User logout');
            logout();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const adminMenuItems: MenuItem[] = [
    {
      id: 'users',
      title: 'Manage Users',
      subtitle: 'Add/edit doctors and staff',
      icon: 'people',
      iconBg: '#7C3AED',
      onPress: () => router.push('/(app)/admin/users'),
      role: 'admin',
    },
    {
      id: 'availability',
      title: 'Manage Availability',
      subtitle: 'Set doctor clinic timings',
      icon: 'calendar',
      iconBg: '#0A7B6E',
      onPress: () => router.push('/(app)/admin/manage-availability'),
      role: 'admin',
    },

    // --- ADDED THIS NEW TEMPLATE SECTION ---
    {
      id: 'templates',
      title: 'Manage Templates',
      subtitle: 'Branding, logos & prescription styles',
      icon: 'color-palette',
      iconBg: '#06B6D4', // A nice cyan color to stand out
      onPress: () => router.push('/(app)/admin/templates/new'),
      role: 'admin',
    },
    // ---------------------------------------
  ];

  const doctorMenuItems: MenuItem[] = [
    {
      id: 'my-availability',
      title: 'My Availability',
      subtitle: 'Set your clinic timings',
      icon: 'time',
      iconBg: '#0A7B6E',
      onPress: () => router.push('/(app)/admin/availability'),
      role: 'doctor',
    },
  ];

  const generalMenuItems: MenuItem[] = [
    {
      id: 'profile',
      title: 'Profile',
      subtitle: 'View and edit your profile',
      icon: 'person',
      iconBg: '#3B82F6',
      onPress: () => Alert.alert('Coming Soon', 'Profile editing will be available soon'),
      role: 'all',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage notification settings',
      icon: 'notifications',
      iconBg: '#F59E0B',
      onPress: () => Alert.alert('Coming Soon', 'Notification settings will be available soon'),
      role: 'all',
    },
    {
      id: 'about',
      title: 'About DocAssist',
      subtitle: 'Version 1.0.0',
      icon: 'information-circle',
      iconBg: '#6B7280',
      onPress: () => Alert.alert('DocAssist', 'Version 1.0.0\n\nDoctor Workflow Management App'),
      role: 'all',
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
      <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {isAdmin ? 'Administrator' : isDoctor ? 'Doctor' : 'User'}
              </Text>
            </View>
          </View>
        </View>

        {/* Admin Section */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADMINISTRATION</Text>
            <View style={styles.menuCard}>
              {adminMenuItems.map(renderMenuItem)}
            </View>
          </View>
        )}

        {/* Doctor Section */}
        {isDoctor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MY PRACTICE</Text>
            <View style={styles.menuCard}>
              {doctorMenuItems.map(renderMenuItem)}
            </View>
          </View>
        )}

        {/* General Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GENERAL</Text>
          <View style={styles.menuCard}>
            {generalMenuItems.map(renderMenuItem)}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#DCE4ED' },
  headerTitle: { fontSize: 24, fontWeight: '600', color: '#0D1B2A' },
  content: { flex: 1, padding: 16 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  userAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#0A7B6E', alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  userInfo: { flex: 1, marginLeft: 14 },
  userName: { fontSize: 18, fontWeight: '600', color: '#0D1B2A' },
  userEmail: { fontSize: 13, color: '#6B7C93', marginTop: 2 },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: '#E6F5F3', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: '#0A7B6E' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#6B7C93', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  menuCard: { backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F5F8FA' },
  menuIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuContent: { flex: 1, marginLeft: 12 },
  menuTitle: { fontSize: 15, fontWeight: '500', color: '#0D1B2A' },
  menuSubtitle: { fontSize: 12, color: '#6B7C93', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEE2E2', paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#DC2626' },
});
