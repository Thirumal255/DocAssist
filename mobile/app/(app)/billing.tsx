import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { invoicesApi, clinicApi } from '../../api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants';
import { Card } from '../../components';
import { log } from '../../utils/logger';

const MODULE = 'BillingScreen';

export default function BillingScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = useState<any>(null); // State for clinic profile
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'PAID' | 'REFUNDED'>('PENDING');

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- UPDATED: Fetch Invoices AND Clinic Settings simultaneously ---
  const loadData = useCallback(async () => {
    log.info(MODULE, 'Loading invoices and clinic settings');
    try {
      const [invoicesRes, clinicRes] = await Promise.all([
        invoicesApi.getAll(),
        clinicApi.getSettings()
      ]);

      if (invoicesRes.data) {
        const invoiceData = Array.isArray(invoicesRes.data) ? invoicesRes.data : invoicesRes.data.data || [];
        setInvoices(invoiceData);
      }
      
      if (clinicRes.data) {
        // Handle potential axios nesting (e.g., data.data vs just data)
        setClinicSettings(clinicRes.data.data || clinicRes.data);
      }
    } catch (error) {
      log.error(MODULE, 'Failed to load data', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCollectPaymentClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentModalVisible(true);
  };

  const processPayment = async (method: 'CASH' | 'CARD' | 'UPI') => {
    if (!selectedInvoice) return;
    setIsProcessing(true);
    try {
      const result = await invoicesApi.pay(selectedInvoice.id, method); 
      if (result.data) {
        Alert.alert('Success', 'Payment collected successfully!');
        setPaymentModalVisible(false);
        setSelectedInvoice(null);
        loadData(); // Refresh list to move to PAID tab
      }
    } catch (error) {
      log.error(MODULE, 'Payment failed', error);
      Alert.alert('Error', 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UPDATED: Dynamic HTML Template using ClinicSettings ---
  const getReceiptHtml = (invoice: any) => {
    const isRefund = invoice.status === 'REFUNDED';
    const dateStr = new Date(isRefund ? invoice.refundedAt || invoice.updatedAt : invoice.paidAt || invoice.updatedAt).toLocaleDateString('en-IN');
    
    // Fallbacks just in case settings haven't loaded or are empty
    const clinicName = clinicSettings?.name || 'DocAssist Clinic';
    const brandColor = clinicSettings?.brandColor || '#0A7B6E';
    const footerMsg = clinicSettings?.footerText || 'Thank you for trusting us with your health!';

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${brandColor}; padding-bottom: 20px; margin-bottom: 20px; }
            .logo-img { max-height: 80px; max-width: 250px; object-fit: contain; }
            .logo-text { font-size: 28px; font-weight: bold; color: ${brandColor}; margin: 0; }
            .clinic-info { text-align: right; font-size: 14px; color: #555; line-height: 1.5; }
            .doc-title { text-align: center; font-size: 22px; color: #333; margin-top: 10px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 16px; }
            .label { font-weight: bold; color: #666; width: 120px; display: inline-block; }
            .amount-box { background-color: ${isRefund ? '#FEE2E2' : '#F0FDF4'}; padding: 30px; text-align: center; border-radius: 12px; margin: 40px 0; border: 1px solid ${isRefund ? '#FCA5A5' : '#86EFAC'}; }
            .amount-label { font-size: 18px; color: #666; margin-bottom: 10px; }
            .amount { font-size: 42px; font-weight: bold; color: ${isRefund ? '#DC2626' : brandColor}; margin: 0; }
            .method { margin-top: 15px; font-size: 16px; color: #666; }
            .footer { margin-top: 60px; text-align: center; font-size: 14px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              ${clinicSettings?.logoBase64 
                ? `<img src="${clinicSettings.logoBase64}" class="logo-img" />` 
                : `<h1 class="logo-text">${clinicName}</h1>`
              }
            </div>
            <div class="clinic-info">
              <strong>${clinicName}</strong><br>
              ${clinicSettings?.address ? clinicSettings.address.replace(/\n/g, '<br>') + '<br>' : ''}
              ${clinicSettings?.phone ? `Ph: ${clinicSettings.phone}<br>` : ''}
              ${clinicSettings?.email ? `Email: ${clinicSettings.email}<br>` : ''}
              ${clinicSettings?.taxId ? `<strong>Tax/Reg ID:</strong> ${clinicSettings.taxId}` : ''}
            </div>
          </div>
          
          <div class="doc-title">${isRefund ? 'Refund Note' : 'Payment Receipt'}</div>
          
          <div class="row">
            <div><span class="label">Patient:</span> ${invoice.patient?.name || 'Walk-in Patient'}</div>
            <div><span class="label">Date:</span> ${dateStr}</div>
          </div>
          <div class="row">
            <div><span class="label">Doctor:</span> Dr. ${invoice.appointment?.doctor?.name || 'N/A'}</div>
            <div><span class="label">Invoice No:</span> #${invoice.id.slice(-6).toUpperCase()}</div>
          </div>
          
          <div class="amount-box">
            <div class="amount-label">${isRefund ? 'Amount Refunded' : 'Amount Paid'}</div>
            <h1 class="amount">₹${invoice.amount}</h1>
            <div class="method">
              ${isRefund ? 'Original Payment Method' : 'Paid via'}: <strong>${invoice.paymentMethod || 'N/A'}</strong>
            </div>
          </div>
          
          <div class="footer">
            ${footerMsg}<br><br>
            This is a computer-generated document and does not require a physical signature.
          </div>
        </body>
      </html>
    `;
  };

  const generateAndShareReceipt = async (invoice: any) => {
    try {
      const { uri } = await Print.printToFileAsync({ html: getReceiptHtml(invoice), base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Receipt' });
    } catch (error) {
      log.error(MODULE, 'Error sharing receipt', error);
      Alert.alert('Error', 'Could not generate the receipt document.');
    }
  };

  const printReceipt = async (invoice: any) => {
    try {
      await Print.printAsync({ html: getReceiptHtml(invoice) });
    } catch (error) {
      log.error(MODULE, 'Error printing receipt', error);
      Alert.alert('Error', 'Could not print the receipt.');
    }
  };

  const filteredInvoices = invoices.filter(inv => inv.status === activeTab);

  const renderInvoice = ({ item }: { item: any }) => (
    <Card style={styles.invoiceCard}>
      <View style={styles.cardHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.patient?.name || 'Unknown Patient'}</Text>
          <Text style={styles.doctorName}>👨‍⚕️ Dr. {item.appointment?.doctor?.name || 'Unknown'}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.amountText, item.status === 'REFUNDED' && { color: Colors.red }]}>
            ₹{item.amount}
          </Text>
          <View style={[
            styles.statusBadge, 
            item.status === 'PAID' ? styles.badgePaid : item.status === 'REFUNDED' ? styles.badgeRefunded : styles.badgePending
          ]}>
            <Text style={[
              styles.statusText, 
              item.status === 'PAID' ? styles.textPaid : item.status === 'REFUNDED' ? styles.textRefunded : styles.textPending
            ]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>

      {item.status !== 'PENDING' && item.paymentMethod && (
        <Text style={styles.paymentMethodText}>
          {item.status === 'REFUNDED' ? 'Original Payment' : 'Paid'} via: {item.paymentMethod}
        </Text>
      )}

      {item.status === 'PENDING' ? (
        <TouchableOpacity style={styles.payButton} onPress={() => handleCollectPaymentClick(item)}>
          <Ionicons name="card-outline" size={18} color={Colors.white} />
          <Text style={styles.payButtonText}>Collect Payment</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing['2xl'] }}>
          <TouchableOpacity 
            style={[styles.shareBtn, { flex: 1 }]} 
            onPress={() => generateAndShareReceipt(item)}
          >
            <Ionicons name="share-outline" size={18} color={Colors.teal} />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.shareBtn, { flex: 1, backgroundColor: Colors.white }]} 
            onPress={() => printReceipt(item)}
          >
            <Ionicons name="print-outline" size={18} color={Colors.teal} />
            <Text style={styles.shareBtnText}>Print</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Billing & Invoices</Text>
      </View>

      <View style={styles.tabContainer}>
        {(['PENDING', 'PAID', 'REFUNDED'] as const).map(tab => (
          <TouchableOpacity 
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.teal} />
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoice}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={() => { setIsRefreshing(true); loadData(); }} // Updated to call loadData
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="receipt-outline" size={48} color={Colors.muted} />
              <Text style={styles.emptyText}>No {activeTab.toLowerCase()} invoices found.</Text>
            </View>
          }
        />
      )}

      {/* Payment Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Collect Payment</Text>
            <Text style={styles.modalSubtitle}>Amount Due: ₹{selectedInvoice?.amount}</Text>
            <Text style={styles.methodLabel}>Select Payment Method:</Text>
            <View style={styles.methodRow}>
              {(['CASH', 'UPI', 'CARD'] as const).map(method => (
                <TouchableOpacity 
                  key={method} 
                  style={styles.methodBtn}
                  onPress={() => processPayment(method)}
                  disabled={isProcessing}
                >
                  <Ionicons name={method === 'CASH' ? 'cash-outline' : method === 'UPI' ? 'phone-portrait-outline' : 'card-outline'} size={24} color={Colors.teal} />
                  <Text style={styles.methodBtnText}>{method}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setPaymentModalVisible(false)} disabled={isProcessing}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing['3xl'], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: Typography.fontSize['3xl'], fontWeight: '600', color: Colors.navy },
  tabContainer: { flexDirection: 'row', backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: Colors.teal },
  tabText: { fontSize: Typography.fontSize.md, color: Colors.slate, fontWeight: '500' },
  activeTabText: { color: Colors.teal, fontWeight: '700' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: Spacing['10xl'] },
  emptyText: { fontSize: Typography.fontSize.md, color: Colors.muted, marginTop: Spacing.lg },
  listContent: { padding: Spacing['3xl'] },
  invoiceCard: { marginBottom: Spacing['2xl'], padding: Spacing['2xl'] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: Typography.fontSize.lg, fontWeight: '600', color: Colors.navy },
  doctorName: { fontSize: Typography.fontSize.sm, color: Colors.slate, marginTop: Spacing.xs },
  amountContainer: { alignItems: 'flex-end' },
  amountText: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.navy },
  statusBadge: { marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.sm },
  badgePending: { backgroundColor: '#FEE2E2' },
  badgePaid: { backgroundColor: '#D1FAE5' },
  badgeRefunded: { backgroundColor: '#FEE2E2' },
  textPending: { color: Colors.red, fontSize: Typography.fontSize.xs, fontWeight: '600' },
  textPaid: { color: Colors.green, fontSize: Typography.fontSize.xs, fontWeight: '600' },
  textRefunded: { color: Colors.red, fontSize: Typography.fontSize.xs, fontWeight: '600' },
  paymentMethodText: { marginTop: Spacing.md, fontSize: Typography.fontSize.sm, color: Colors.muted, fontStyle: 'italic' },
  payButton: { marginTop: Spacing['2xl'], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.teal, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  payButtonText: { color: Colors.white, fontSize: Typography.fontSize.md, fontWeight: '600' },
  shareBtn: { marginTop: Spacing['2xl'], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.tealPale, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.teal },
  shareBtnText: { color: Colors.teal, fontSize: Typography.fontSize.md, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'], padding: Spacing['3xl'], paddingBottom: 50 },
  modalTitle: { fontSize: Typography.fontSize['2xl'], fontWeight: '700', color: Colors.navy, textAlign: 'center' },
  modalSubtitle: { fontSize: Typography.fontSize.lg, color: Colors.slate, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing['3xl'] },
  methodLabel: { fontSize: Typography.fontSize.md, fontWeight: '600', color: Colors.navy, marginBottom: Spacing.lg },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, marginBottom: Spacing['3xl'] },
  methodBtn: { flex: 1, alignItems: 'center', padding: Spacing['2xl'], backgroundColor: Colors.background, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border },
  methodBtnText: { marginTop: Spacing.sm, fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.navy },
  cancelBtn: { padding: Spacing.lg, alignItems: 'center' },
  cancelBtnText: { color: Colors.red, fontSize: Typography.fontSize.md, fontWeight: '600' }
});