import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, BorderRadius, Typography, Spacing, Shadows } from '../../../constants';
import { Card, Badge } from '../../../components';
import { patientsApi, prescriptionsApi, medicinesApi, aiApi } from '../../../api';
import { Patient, Medicine, AISuggestion } from '../../../types';
import { log } from '../../../utils/logger';

const MODULE = 'NewPrescription';

interface MedicineItem {
  id: string;
  name: string;
  genericName?: string;
  dose: string;
  frequency: string;
  timing: 'before_food' | 'after_food' | 'with_food' | 'any_time';
  days: number;
}

export default function NewPrescriptionScreen() {
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [vitals, setVitals] = useState({ bp: '', weight: '', pulse: '', temperature: '' });

  // Log screen mount
  useEffect(() => {
    log.screen(MODULE, 'mount');
    log.info(MODULE, 'Initializing prescription screen', { patientId });
    return () => log.screen(MODULE, 'unmount');
  }, []);

  // Load patient data
  useEffect(() => {
    const loadPatient = async () => {
      if (!patientId) {
        log.warn(MODULE, 'No patientId provided');
        setIsLoadingPatient(false);
        return;
      }

      log.info(MODULE, 'Loading patient data', { patientId });
      try {
        const result = await patientsApi.getById(patientId);
        if (result.data) {
          setPatient(result.data);
          log.info(MODULE, 'Patient loaded successfully', { name: result.data.name });
        } else {
          log.error(MODULE, 'Failed to load patient', result.error);
        }
      } catch (err) {
        log.error(MODULE, 'Exception loading patient', err);
      } finally {
        setIsLoadingPatient(false);
      }
    };

    loadPatient();
  }, [patientId]);

  // Search medicines with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        log.debug(MODULE, 'Searching medicines', { query: searchQuery });
        setIsSearching(true);
        try {
          const result = await medicinesApi.search(searchQuery);
          if (result.data) {
            setSearchResults(result.data);
            log.debug(MODULE, `Found ${result.data.length} medicines`);
          }
        } catch (err) {
          log.error(MODULE, 'Medicine search error', err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get AI suggestions when diagnosis changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (diagnosis.length > 10 && patientId) {
        log.info(MODULE, 'Requesting AI suggestions', { diagnosisLength: diagnosis.length });
        setIsLoadingAI(true);
        try {
          const result = await aiApi.getSuggestions(diagnosis, patientId);
          if (result.data) {
            setAiSuggestion(result.data);
            log.info(MODULE, 'AI suggestions received', { medicineCount: result.data.medicines?.length });
          }
        } catch (err) {
          log.error(MODULE, 'AI suggestion error', err);
        } finally {
          setIsLoadingAI(false);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [diagnosis, patientId]);

  const addMedicine = (med: Medicine) => {
    log.action(MODULE, 'Add medicine from search', { name: med.brandName });
    const newMed: MedicineItem = {
      id: Date.now().toString(),
      name: `${med.brandName} ${med.strength}`,
      genericName: med.genericName,
      dose: '1-0-0',
      frequency: 'daily',
      timing: 'after_food',
      days: 30,
    };
    setMedicines([...medicines, newMed]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const addAIMedicine = (med: { name: string; genericName: string; dose: string }) => {
    log.action(MODULE, 'Add AI suggested medicine', { name: med.name });
    const newMed: MedicineItem = {
      id: Date.now().toString(),
      name: med.name,
      genericName: med.genericName,
      dose: med.dose,
      frequency: 'daily',
      timing: 'after_food',
      days: 30,
    };
    setMedicines([...medicines, newMed]);
  };

  const removeMedicine = (id: string) => {
    log.action(MODULE, 'Remove medicine', { id });
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const updateMedicine = (id: string, field: keyof MedicineItem, value: string | number) => {
    setMedicines(medicines.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSave = async () => {
    log.group('Save Prescription');
    log.info(MODULE, 'Starting prescription save');
    
    // Validation
    if (!patientId) {
      log.warn(MODULE, 'Validation failed: No patient selected');
      Alert.alert('Error', 'Please select a patient first');
      log.groupEnd();
      return;
    }
    if (!diagnosis.trim()) {
      log.warn(MODULE, 'Validation failed: No diagnosis');
      Alert.alert('Error', 'Please enter a diagnosis');
      log.groupEnd();
      return;
    }
    if (medicines.length === 0) {
      log.warn(MODULE, 'Validation failed: No medicines');
      Alert.alert('Error', 'Please add at least one medicine');
      log.groupEnd();
      return;
    }

    log.info(MODULE, 'Validation passed', {
      patientId,
      diagnosis: diagnosis.substring(0, 50),
      medicineCount: medicines.length,
      hasVitals: !!(vitals.bp || vitals.weight)
    });

    setIsSaving(true);
    try {
      // Prepare prescription data - NO visitId, let backend create it
      const prescriptionData = {
        patientId,
        diagnosis,
        items: medicines.map(med => ({
          medicineName: med.name,
          genericName: med.genericName || undefined,
          dose: med.dose,
          frequency: med.frequency,
          timing: med.timing,
          days: med.days,
        })),
        aiSuggestionUsed: aiSuggestion !== null,
      };

      log.info(MODULE, 'Sending prescription to API', {
        itemCount: prescriptionData.items.length
      });

      const result = await prescriptionsApi.create(prescriptionData);

      if (result.data) {
        log.info(MODULE, '✅ Prescription saved successfully', { 
          prescriptionId: result.data.id 
        });
        
        Alert.alert('Success', 'Prescription saved successfully!', [
          { 
            text: 'View Patient', 
            onPress: () => {
              log.action(MODULE, 'Navigate to patient after save');
              router.replace({ pathname: '/(app)/patients/[id]', params: { id: patientId } });
            }
          },
          { 
            text: 'New Prescription', 
            onPress: () => {
              log.action(MODULE, 'Reset form for new prescription');
              resetForm();
            }
          },
        ]);
      } else {
        log.error(MODULE, '❌ Prescription save failed', { error: result.error });
        Alert.alert('Error', result.error || 'Failed to save prescription. Please try again.');
      }
    } catch (err: any) {
      log.error(MODULE, '❌ Exception during save', err);
      Alert.alert('Error', err.message || 'Failed to save prescription. Please try again.');
    } finally {
      setIsSaving(false);
      log.groupEnd();
    }
  };

  const resetForm = () => {
    log.info(MODULE, 'Resetting form');
    setDiagnosis('');
    setMedicines([]);
    setAiSuggestion(null);
    setVitals({ bp: '', weight: '', pulse: '', temperature: '' });
  };

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>New Prescription</Text>
          <Text style={styles.headerSub}>{patient?.name || 'Select Patient'}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.tealLight} />
          ) : (
            <>
              <Ionicons name="save-outline" size={14} color={Colors.tealLight} />
              <Text style={styles.saveBtnText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Patient Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={14} color={Colors.teal} />
            <Text style={styles.sectionTitle}>PATIENT</Text>
          </View>
          {isLoadingPatient ? (
            <ActivityIndicator color={Colors.teal} />
          ) : patient ? (
            <View style={styles.patientRow}>
              <View style={[styles.patientAvatar, { backgroundColor: patient.gender === 'female' ? '#FCE7F3' : '#E0F2FE' }]}>
                <Ionicons name={patient.gender === 'female' ? 'woman' : 'man'} size={20} color={patient.gender === 'female' ? '#EC4899' : '#0369A1'} />
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.name}, {patient.age || calculateAge(patient.dob)}{patient.gender === 'male' ? 'M' : 'F'}</Text>
                <Text style={styles.patientMeta}>{patient.phone} · {patient.bloodGroup || 'Blood group unknown'}</Text>
                {patient.chronicConditions && patient.chronicConditions.length > 0 && (
                  <View style={styles.tags}>
                    {patient.chronicConditions.map(cond => (
                      <Badge key={cond} label={cond} variant={cond === 'diabetes' ? 'diabetic' : 'hypertensive'} />
                    ))}
                  </View>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.selectPatientBtn} onPress={() => router.push('/(app)/patients')}>
              <Ionicons name="person-add-outline" size={20} color={Colors.teal} />
              <Text style={styles.selectPatientText}>Select a patient</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Diagnosis Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medkit" size={14} color={Colors.teal} />
            <Text style={styles.sectionTitle}>DIAGNOSIS</Text>
          </View>
          <TextInput 
            style={[styles.diagInput, diagnosis && styles.diagInputFilled]} 
            placeholder="Type 2 Diabetes, uncontrolled; Hypertension Grade 1" 
            placeholderTextColor={Colors.muted} 
            value={diagnosis} 
            onChangeText={setDiagnosis} 
            multiline 
          />
        </Card>

        {/* AI Suggestion Panel */}
        {(isLoadingAI || aiSuggestion) && (
          <View style={styles.aiPanel}>
            <View style={styles.aiHeader}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={10} color={Colors.white} />
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
              <Text style={styles.aiTitle}>{isLoadingAI ? 'Analyzing...' : 'AI Suggestions'}</Text>
            </View>
            {isLoadingAI ? (
              <View style={styles.aiLoading}>
                <ActivityIndicator color={Colors.teal} />
                <Text style={styles.aiLoadingText}>Getting suggestions from AI</Text>
              </View>
            ) : aiSuggestion && (
              <>
                <Text style={styles.aiNotes}>{aiSuggestion.notes}</Text>
                <View style={styles.aiMedicines}>
                  {aiSuggestion.medicines.map((med, index) => (
                    <TouchableOpacity key={index} style={styles.aiMedChip} onPress={() => addAIMedicine(med)}>
                      <Ionicons name="add" size={12} color={Colors.teal} />
                      <Text style={styles.aiMedText}>{med.name} {med.dose}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {aiSuggestion.warnings && aiSuggestion.warnings.length > 0 && (
                  <View style={styles.aiWarnings}>
                    {aiSuggestion.warnings.map((warning, index) => (
                      <View key={index} style={styles.aiWarningRow}>
                        <Ionicons name="warning" size={12} color={Colors.amber} />
                        <Text style={styles.aiWarningText}>{warning}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.aiDisclaimer}>AI suggestions for reference only. Doctor's judgment applies.</Text>
              </>
            )}
          </View>
        )}

        {/* Medicines Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical" size={14} color={Colors.teal} />
            <Text style={styles.sectionTitle}>MEDICINES ({medicines.length})</Text>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={Colors.teal} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search medicine name..." 
              placeholderTextColor={Colors.muted} 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
            />
            {isSearching && <ActivityIndicator size="small" color={Colors.teal} />}
          </View>
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map(med => (
                <TouchableOpacity key={med.id} style={styles.searchItem} onPress={() => addMedicine(med)}>
                  <View>
                    <Text style={styles.searchItemName}>{med.brandName} {med.strength}</Text>
                    <Text style={styles.searchItemGeneric}>{med.genericName} · {med.form}</Text>
                  </View>
                  <Ionicons name="add-circle" size={20} color={Colors.teal} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Medicine List */}
          {medicines.map(med => (
            <View key={med.id} style={styles.medItem}>
              <View style={styles.medHeader}>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  {med.genericName && <Text style={styles.medGeneric}>{med.genericName}</Text>}
                </View>
                <TouchableOpacity onPress={() => removeMedicine(med.id)} style={styles.medDeleteBtn}>
                  <Ionicons name="close-circle" size={22} color={Colors.red} />
                </TouchableOpacity>
              </View>
              <View style={styles.medDetails}>
                <View style={styles.medField}>
                  <Text style={styles.medFieldLabel}>Dose</Text>
                  <TextInput
                    style={styles.medFieldInput}
                    value={med.dose}
                    onChangeText={(text) => updateMedicine(med.id, 'dose', text)}
                    placeholder="1-0-1"
                  />
                </View>
                <View style={styles.medField}>
                  <Text style={styles.medFieldLabel}>Days</Text>
                  <TextInput
                    style={styles.medFieldInput}
                    value={med.days.toString()}
                    onChangeText={(text) => updateMedicine(med.id, 'days', parseInt(text) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.medField}>
                  <Text style={styles.medFieldLabel}>Timing</Text>
                  <TouchableOpacity 
                    style={styles.timingBtn}
                    onPress={() => {
                      const timings: ('before_food' | 'after_food' | 'with_food')[] = ['after_food', 'before_food', 'with_food'];
                      const currentIndex = timings.indexOf(med.timing as any);
                      const nextTiming = timings[(currentIndex + 1) % timings.length];
                      updateMedicine(med.id, 'timing', nextTiming);
                    }}
                  >
                    <Text style={styles.timingText}>
                      {med.timing === 'after_food' ? 'After' : med.timing === 'before_food' ? 'Before' : 'With'} food
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {medicines.length === 0 && (
            <View style={styles.noMedicines}>
              <Text style={styles.noMedicinesText}>No medicines added yet. Search above or use AI suggestions.</Text>
            </View>
          )}
        </Card>

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnOutline} onPress={() => Alert.alert('Print', 'Print functionality coming soon!')}>
            <Ionicons name="print-outline" size={16} color={Colors.teal} />
            <Text style={styles.btnOutlineText}>Print Rx</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSolid} onPress={() => Alert.alert('SMS', 'SMS functionality coming soon!')}>
            <Ionicons name="send-outline" size={16} color={Colors.white} />
            <Text style={styles.btnSolidText}>Send SMS</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.navy, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '600', color: Colors.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,166,142,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 12, fontWeight: '600', color: Colors.tealLight },
  body: { flex: 1, padding: 14 },
  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.teal, letterSpacing: 1 },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  patientAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '600', color: Colors.navy },
  patientMeta: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  tags: { flexDirection: 'row', gap: 4, marginTop: 6 },
  selectPatientBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing['2xl'], backgroundColor: Colors.tealPale, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.teal, borderStyle: 'dashed' },
  selectPatientText: { fontSize: Typography.fontSize.md, color: Colors.teal, fontWeight: '500' },
  diagInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 13, color: Colors.slate, minHeight: 50, textAlignVertical: 'top' },
  diagInputFilled: { borderColor: Colors.teal, backgroundColor: Colors.tealPale },
  aiPanel: { backgroundColor: Colors.tealPale, borderWidth: 1.5, borderColor: Colors.tealMid, borderRadius: 14, padding: 14, marginBottom: 12 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.teal, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  aiBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  aiTitle: { fontSize: 13, fontWeight: '600', color: Colors.teal },
  aiLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  aiLoadingText: { fontSize: 12, color: Colors.slate },
  aiNotes: { fontSize: 12, color: Colors.slate, lineHeight: 18, marginBottom: 8 },
  aiMedicines: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aiMedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.tealMid, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  aiMedText: { fontSize: 11, fontWeight: '600', color: Colors.teal },
  aiWarnings: { marginTop: 10 },
  aiWarningRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiWarningText: { fontSize: 11, color: Colors.amber },
  aiDisclaimer: { fontSize: 10, color: Colors.muted, fontStyle: 'italic', marginTop: 12, textAlign: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.teal, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 13, color: Colors.slate, padding: 0 },
  searchResults: { backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 10, ...Shadows.small },
  searchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchItemName: { fontSize: 13, fontWeight: '600', color: Colors.navy },
  searchItemGeneric: { fontSize: 11, color: Colors.muted },
  medItem: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, marginBottom: 10 },
  medHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '600', color: Colors.navy },
  medGeneric: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  medDeleteBtn: { padding: 2 },
  medDetails: { flexDirection: 'row', gap: 10 },
  medField: { flex: 1 },
  medFieldLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted, marginBottom: 4 },
  medFieldInput: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12, textAlign: 'center' },
  timingBtn: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  timingText: { fontSize: 11, color: Colors.slate, textAlign: 'center' },
  noMedicines: { paddingVertical: Spacing['3xl'], alignItems: 'center' },
  noMedicinesText: { fontSize: Typography.fontSize.sm, color: Colors.muted, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.teal, borderRadius: 12, paddingVertical: 12 },
  btnOutlineText: { fontSize: 13, fontWeight: '600', color: Colors.teal },
  btnSolid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.teal, borderRadius: 12, paddingVertical: 12 },
  btnSolidText: { fontSize: 13, fontWeight: '600', color: Colors.white },
});
