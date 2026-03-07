import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { PieChart } from 'react-native-chart-kit';
import { reportsApi } from '../../api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants';
import { Card } from '../../components';
import { useAuthStore } from '../../store'; // <-- Added to check Admin role
import { log } from '../../utils/logger';

const MODULE = 'ReportsScreen';
const screenWidth = Dimensions.get('window').width;

type TimeRange = 'today' | 'week' | 'month';

export default function ReportsScreen() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [range, setRange] = useState<TimeRange>('today');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await reportsApi.getDashboardStats(range);
      const payload = result.data?.data || result.data;
      if (payload && payload.financials) {
        setReportData(payload);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load report data', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadReport();
  };

  if (isLoading && !reportData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.teal} />
        </View>
      </SafeAreaView>
    );
  }

  const { financials, operations, doctorStats } = reportData || { financials: {}, operations: {}, doctorStats: [] };

  const pieChartData = [
    { name: 'Cash', population: financials?.paymentMethods?.CASH || 0, color: '#10B981', legendFontColor: Colors.slate, legendFontSize: 13 },
    { name: 'Card', population: financials?.paymentMethods?.CARD || 0, color: '#3B82F6', legendFontColor: Colors.slate, legendFontSize: 13 },
    { name: 'UPI', population: financials?.paymentMethods?.UPI || 0, color: '#8B5CF6', legendFontColor: Colors.slate, legendFontSize: 13 },
  ].filter(item => item.population > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={() => alert('PDF Export coming soon!')}>
          <Ionicons name="download-outline" size={20} color={Colors.teal} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {(['today', 'week', 'month'] as const).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.filterTab, range === r && styles.filterTabActive]}
            onPress={() => setRange(r)}
          >
            <Text style={[styles.filterTabText, range === r && styles.filterTabTextActive]}>
              {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.teal]} />}
      >
        
        {/* FINANCIAL SUMMARY */}
        <Text style={styles.sectionTitle}>Financial Health</Text>
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { backgroundColor: Colors.teal }]}>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>Total Revenue</Text>
            <Text style={[styles.statValue, { color: Colors.white }]}>₹{financials?.totalRevenue || 0}</Text>
          </Card>
          <View style={styles.statColumn}>
            <Card style={[styles.statCardMini, { marginBottom: Spacing.md }]}>
              <Text style={styles.statLabelMini}>Pending Dues</Text>
              <Text style={[styles.statValueMini, { color: Colors.amber }]}>₹{financials?.pendingRevenue || 0}</Text>
            </Card>
            <Card style={styles.statCardMini}>
              <Text style={styles.statLabelMini}>Refunded</Text>
              <Text style={[styles.statValueMini, { color: Colors.red }]}>₹{financials?.refundedRevenue || 0}</Text>
            </Card>
          </View>
        </View>

        {/* PAYMENT METHODS CHART */}
        {pieChartData.length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Payment Breakdown</Text>
            <PieChart
              data={pieChartData}
              width={screenWidth - 64}
              height={180}
              chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10, 0]}
              absolute
            />
          </Card>
        )}

        {/* OPERATIONAL SUMMARY */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Clinic Operations</Text>
        <View style={styles.opStatsGrid}>
          <Card style={styles.opStatCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#EEF2FF' }]}><Ionicons name="people" size={24} color="#6366F1" /></View>
            <Text style={styles.opStatValue}>{operations?.totalAppointments || 0}</Text>
            <Text style={styles.opStatLabel}>Total Visits</Text>
          </Card>
          
          <Card style={styles.opStatCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#ECFDF5' }]}><Ionicons name="checkmark-circle" size={24} color="#10B981" /></View>
            <Text style={styles.opStatValue}>{operations?.completedAppointments || 0}</Text>
            <Text style={styles.opStatLabel}>Completed</Text>
          </Card>

          <Card style={styles.opStatCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#FEF2F2' }]}><Ionicons name="close-circle" size={24} color="#EF4444" /></View>
            <Text style={styles.opStatValue}>{operations?.cancelledAppointments || 0}</Text>
            <Text style={styles.opStatLabel}>Cancelled</Text>
          </Card>

          <Card style={styles.opStatCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#FFFBEB' }]}><Ionicons name="alert-circle" size={24} color="#F59E0B" /></View>
            <Text style={styles.opStatValue}>{operations?.noShowAppointments || 0}</Text>
            <Text style={styles.opStatLabel}>No Shows</Text>
          </Card>
        </View>

        {/* --- NEW: DOCTOR PERFORMANCE (Admins Only) --- */}
        {isAdmin && doctorStats && doctorStats.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing['2xl'] }]}>Doctor Performance</Text>
            {doctorStats.map((doc: any, index: number) => (
              <Card key={index} style={styles.doctorCard}>
                <View style={styles.docInfo}>
                  <View style={styles.docAvatar}>
                    <Text style={styles.docAvatarText}>{doc.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.docName}>Dr. {doc.name}</Text>
                </View>
                <View style={styles.docStats}>
                  <View style={styles.docStatItem}>
                    <Text style={styles.docStatLabel}>Patients</Text>
                    <Text style={styles.docStatValue}>{doc.appointments}</Text>
                  </View>
                  <View style={styles.docStatItem}>
                    <Text style={styles.docStatLabel}>Revenue</Text>
                    <Text style={[styles.docStatValue, { color: Colors.teal }]}>₹{doc.revenue}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing['2xl'], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.navy },
  exportBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  
  filterContainer: { flexDirection: 'row', backgroundColor: Colors.white, paddingHorizontal: Spacing['3xl'], paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterTab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterTabActive: { borderBottomColor: Colors.teal },
  filterTabText: { fontSize: Typography.fontSize.sm, color: Colors.slate, fontWeight: '500' },
  filterTabTextActive: { color: Colors.teal, fontWeight: '700' },
  
  content: { flex: 1, padding: Spacing['3xl'] },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.navy, marginBottom: Spacing.lg },
  
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing['2xl'] },
  statCard: { flex: 1, padding: Spacing['2xl'], justifyContent: 'center' },
  statLabel: { fontSize: Typography.fontSize.sm, fontWeight: '600', marginBottom: Spacing.sm },
  statValue: { fontSize: 32, fontWeight: '800' },
  
  statColumn: { flex: 1 },
  statCardMini: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
  statLabelMini: { fontSize: Typography.fontSize.xs, color: Colors.slate, fontWeight: '600', marginBottom: 4 },
  statValueMini: { fontSize: Typography.fontSize.xl, fontWeight: '700' },

  chartCard: { padding: Spacing.xl, alignItems: 'center' },
  chartTitle: { fontSize: Typography.fontSize.md, fontWeight: '600', color: Colors.navy, alignSelf: 'flex-start', marginBottom: Spacing.md },
  
  opStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  opStatCard: { width: '47%', padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  iconWrapper: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  opStatValue: { fontSize: Typography.fontSize['2xl'], fontWeight: '700', color: Colors.navy },
  opStatLabel: { fontSize: Typography.fontSize.xs, color: Colors.slate, marginTop: 4, fontWeight: '500' },

  // --- NEW DOCTOR CARD STYLES ---
  doctorCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, marginBottom: Spacing.md },
  docInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.md },
  docAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.tealPale, alignItems: 'center', justifyContent: 'center' },
  docAvatarText: { color: Colors.teal, fontSize: Typography.fontSize.lg, fontWeight: '700' },
  docName: { fontSize: Typography.fontSize.md, fontWeight: '600', color: Colors.navy, flexShrink: 1 },
  docStats: { flexDirection: 'row', gap: Spacing['2xl'] },
  docStatItem: { alignItems: 'flex-end' },
  docStatLabel: { fontSize: Typography.fontSize.xs, color: Colors.muted, fontWeight: '500', marginBottom: 2 },
  docStatValue: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.navy },
});