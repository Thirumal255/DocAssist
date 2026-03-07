import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert,ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, BorderRadius, Typography, Spacing, Shadows } from '../../../constants';
import { Card } from '../../../components';
import { usersApi, User } from '../../../api';
import { useAuthStore } from '../../../store';
import { log } from '../../../utils/logger';

const MODULE = 'AdminUsers';

export default function AdminUsersScreen() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'doctor' | 'admin' | 'receptionist'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      log.warn(MODULE, 'Non-admin user trying to access admin screen');
      Alert.alert('Access Denied', 'Admin access required');
      router.back();
    }
  }, [currentUser]);

  const loadUsers = useCallback(async () => {
    log.info(MODULE, 'Loading users', { search: searchQuery, role: filterRole });
    try {
      const role = filterRole === 'all' ? undefined : filterRole;
      const result = await usersApi.getAll(searchQuery || undefined, role);
      if (result.data) {
        setUsers(result.data);
        log.info(MODULE, `Loaded ${result.data.length} users`);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load users', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, filterRole]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDeactivate = (user: User) => {
    Alert.alert(
      'Deactivate User',
      `Are you sure you want to deactivate ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            log.action(MODULE, 'Deactivate user', { id: user.id });
            try {
              const result = await usersApi.delete(user.id);
              if (result.data) {
                Alert.alert('Success', 'User deactivated');
                loadUsers();
              } else {
                Alert.alert('Error', result.error || 'Failed to deactivate user');
              }
            } catch (error) {
              log.error(MODULE, 'Deactivate failed', error);
            }
          }
        }
      ]
    );
  };

  const handleReactivate = async (user: User) => {
    log.action(MODULE, 'Reactivate user', { id: user.id });
    try {
      const result = await usersApi.update(user.id, { isActive: true });
      if (result.data) {
        Alert.alert('Success', 'User reactivated');
        loadUsers();
      }
    } catch (error) {
      log.error(MODULE, 'Reactivate failed', error);
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <Card style={[styles.userCard, !item.isActive && styles.userCardInactive]}>
      <View style={styles.userRow}>
        <View style={[styles.avatar, { backgroundColor: item.role === 'admin' ? '#EEF2FF' : item.role === 'receptionist' ? '#FEF3C7' : Colors.tealPale }]}>
          <Ionicons 
            name={item.role === 'admin' ? 'shield' : item.role === 'receptionist' ? 'desktop' : 'medical'} 
            size={20} 
            color={item.role === 'admin' ? '#6366F1' : item.role === 'receptionist' ? '#F59E0B' : Colors.teal} 
          />
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.name}</Text>
            {!item.isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.roleBadge, item.role === 'admin' ? styles.adminBadge : item.role === 'receptionist' ? styles.receptionistBadge : styles.doctorBadge]}>
              <Text style={[styles.roleBadgeText, item.role === 'admin' ? styles.adminBadgeText : item.role === 'receptionist' ? styles.receptionistBadgeText : styles.doctorBadgeText]}>
                {item.role === 'admin' ? 'Admin' : item.role === 'receptionist' ? 'Receptionist' : 'Doctor'}
              </Text>
            </View>
            {item.specialty && <Text style={styles.specialty}>{item.specialty}</Text>}
          </View>
        </View>
        

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => router.push({ pathname: '/(app)/admin/edit-user', params: { id: item.id } })}
          >
            <Ionicons name="create-outline" size={18} color={Colors.teal} />
          </TouchableOpacity>
          {item.isActive ? (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.deleteBtn]} 
              onPress={() => handleDeactivate(item)}
            >
              <Ionicons name="close-circle-outline" size={18} color={Colors.red} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.activateBtn]} 
              onPress={() => handleReactivate(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={Colors.green} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => router.push('/(app)/admin/add-user')}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'doctor', 'admin', 'receptionist'] as const).map(role => (
            <TouchableOpacity
              key={role}
              style={[styles.filterBtn, filterRole === role && styles.filterBtnActive]}
              onPress={() => setFilterRole(role)}
            >
              <Text style={[styles.filterBtnText, filterRole === role && styles.filterBtnTextActive]}>
                {role === 'all' ? 'All' : role === 'doctor' ? 'Doctors' : role === 'admin' ? 'Admins' : 'Receptionists'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.teal} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            loadUsers();
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.muted} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing['2xl'], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.fontSize['3xl'], fontWeight: '600', color: Colors.navy },
  addBtn: { width: 40, height: 40, backgroundColor: Colors.teal, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { padding: Spacing['3xl'], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.lg, gap: Spacing.md },
  searchInput: { flex: 1, fontSize: Typography.fontSize.md, color: Colors.slate },
  filterRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing['2xl'] },
  filterBtn: { paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, borderRadius: BorderRadius['4xl'], backgroundColor: Colors.background },
  filterBtnActive: { backgroundColor: Colors.teal },
  filterBtnText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.muted },
  filterBtnTextActive: { color: Colors.white },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing['3xl'] },
  userCard: { marginBottom: Spacing['2xl'] },
  userCardInactive: { opacity: 0.6 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2xl'] },
  avatar: { width: 48, height: 48, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  userName: { fontSize: Typography.fontSize.lg, fontWeight: '600', color: Colors.navy },
  userEmail: { fontSize: Typography.fontSize.sm, color: Colors.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  roleBadge: { paddingHorizontal: Spacing.lg, paddingVertical: 2, borderRadius: BorderRadius.sm },
  adminBadge: { backgroundColor: '#EEF2FF' },
  doctorBadge: { backgroundColor: Colors.tealPale },
  roleBadgeText: { fontSize: Typography.fontSize.xs, fontWeight: '600' },
  adminBadgeText: { color: '#6366F1' },
  doctorBadgeText: { color: Colors.teal },
  specialty: { fontSize: Typography.fontSize.xs, color: Colors.muted },
  inactiveBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: Spacing.md, paddingVertical: 1, borderRadius: BorderRadius.sm },
  inactiveBadgeText: { fontSize: Typography.fontSize.xs, color: Colors.red, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { width: 36, height: 36, borderRadius: BorderRadius.md, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { backgroundColor: '#FEE2E2' },
  activateBtn: { backgroundColor: '#D1FAE5' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing['10xl'] },
  emptyText: { fontSize: Typography.fontSize.md, color: Colors.muted, marginTop: Spacing.lg },
  receptionistBadge: { backgroundColor: '#FEF3C7' },
  receptionistBadgeText: { color: '#F59E0B' },
});
