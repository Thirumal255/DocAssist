import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, 
  Alert, ActivityIndicator, LayoutAnimation, Platform, UIManager, KeyboardAvoidingView 
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Typography, Spacing, BorderRadius } from '../../../constants';
import { Card } from '../../../components';
import { patientsApi, prescriptionsApi, medicinesApi, aiApi } from '../../../api';
import { Patient, AISuggestion } from '../../../types';
import { log } from '../../../utils/logger';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const MODULE = 'NewPrescription';

interface MedicineItem {
  id: string;
  name: string;
  genericName?: string;
  dose: string;
  frequency: string; 
  timing: 'before_food' | 'after_food' | 'with_food' | 'any_time';
  days: number;
  instructions?: string; 
  
  // --- DOCTOR REFERENCE FIELDS ---
  sideEffects?: string;
  interactions?: any; 
  description?: string;
  isExpanded?: boolean; 
}

export default function NewPrescriptionScreen() {
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  
  // Data State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  
  // Form State
  const [diagnosis, setDiagnosis] = useState('');
  const [vitals, setVitals] = useState({ bp: '', weight: '', pulse: '', temperature: '' });
  
  // Medicine State
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false); // --- NEW STATE ---
  
  // AI State
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  // AI Interaction Check State
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  const [aiInteractionWarnings, setAiInteractionWarnings] = useState<string[] | null>(null);

  // Saving State
  const [isSaving, setIsSaving] = useState(false);

  // 1. Reset & Load Logic
  useFocusEffect(
    useCallback(() => {
      log.screen(MODULE, 'focus - resetting state');
      
      setDiagnosis('');
      setMedicines([]);
      setSearchQuery('');
      setSearchResults([]);
      setAiSuggestion(null);
      setAiInteractionWarnings(null);
      setVitals({ bp: '', weight: '', pulse: '', temperature: '' });
      setIsLoadingAI(false);
      setIsSaving(false);

      if (patientId) {
        setIsLoadingPatient(true);
        loadPatient(patientId);
      } else {
        setPatient(null);
        setIsLoadingPatient(false);
      }

      return () => {};
    }, [patientId])
  );

  const loadPatient = async (id: string) => {
    try {
      const result = await patientsApi.getById(id);
      if (result.data) {
        setPatient(result.data);
      } else {
        Alert.alert('Error', 'Failed to load patient details');
      }
    } catch (err) {
      log.error(MODULE, 'Exception loading patient', err);
    } finally {
      setIsLoadingPatient(false);
    }
  };

  // 2. Medicine Search Logic
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await medicinesApi.search(searchQuery);
        if (result.data) {
          setSearchResults(result.data);
        }
      } catch (err) {
        log.error(MODULE, 'Medicine search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. AI Suggestions Logic
  useEffect(() => {
    if (!diagnosis || diagnosis.length <= 10 || !patientId) return;

    const timer = setTimeout(async () => {
      setIsLoadingAI(true);
      try {
        const result = await aiApi.getSuggestions(diagnosis, patientId);
        if (result.data) {
          setAiSuggestion(result.data);
        }
      } catch (err) {
        log.error(MODULE, 'AI suggestion error', err);
      } finally {
        setIsLoadingAI(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [diagnosis, patientId]);

  // 4. Handlers
  const addMedicine = (med: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newMed: MedicineItem = {
      id: Date.now().toString(),
      name: med.name, 
      genericName: med.saltComposition, 
      dose: '1-0-0',
      frequency: 'Daily',
      timing: 'after_food',
      days: 5,
      instructions: '',
      sideEffects: med.sideEffects,
      interactions: med.drugInteractions,
      description: med.medicineDesc,
      isExpanded: false
    };
    setMedicines([...medicines, newMed]);
    setSearchQuery('');
    setSearchResults([]);
    setAiInteractionWarnings(null); 
  };

  // --- NEW HANDLER: Add Custom Medicine ---
  const handleAddNewMedicine = async () => {
    if (!searchQuery.trim()) return;
    
    setIsAddingNew(true);
    try {
      const result = await medicinesApi.create(searchQuery.trim());
      if (result.data) {
        addMedicine(result.data); // Add to list immediately
      } else {
        Alert.alert('Error', 'Failed to add new medicine');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setIsAddingNew(false);
    }
  };

  const addAIMedicine = (med: { name: string; genericName: string; dose: string }) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newMed: MedicineItem = {
      id: Date.now().toString(),
      name: med.name,
      genericName: med.genericName,
      dose: med.dose,
      frequency: 'Daily',
      timing: 'after_food',
      days: 5,
      instructions: '',
      sideEffects: 'Added via AI suggestion', 
      isExpanded: false
    };
    setMedicines([...medicines, newMed]);
    setAiInteractionWarnings(null);
  };

  const removeMedicine = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMedicines(medicines.filter(m => m.id !== id));
    setAiInteractionWarnings(null);
  };

  const updateMedicine = (id: string, field: keyof MedicineItem, value: string | number) => {
    setMedicines(medicines.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMedicines(medicines.map(m => m.id === id ? { ...m, isExpanded: !m.isExpanded } : m));
  };

  const cycleTiming = (current: string) => {
    const timings = ['before_food', 'after_food', 'with_food', 'any_time'];
    const idx = timings.indexOf(current);
    return timings[(idx + 1) % timings.length] as any;
  };

  // --- AI INTERACTION CHECKER ---
  const handleCheckAIInteractions = async () => {
    if (medicines.length < 2) {
      Alert.alert('Info', 'Add at least 2 medicines to check for interactions.');
      return;
    }

    setIsCheckingInteractions(true);
    try {
      const medicineNames = medicines.map(m => m.name);
      const allergies = patient?.allergies || [];

      const result = await aiApi.checkInteractions(medicineNames, allergies);
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      const hasWarnings = result.data && result.data.warnings && result.data.warnings.length > 0;
      
      if (hasWarnings) {
        setAiInteractionWarnings(result.data.warnings);
      } else {
        setAiInteractionWarnings(["✅ No significant interactions detected."]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to check interactions.');
    } finally {
      setIsCheckingInteractions(false);
    }
  };

  const handleSave = async () => {
    if (!patientId) { Alert.alert('Error', 'Please select a patient first'); return; }
    if (!diagnosis.trim()) { Alert.alert('Error', 'Please enter a diagnosis'); return; }
    if (medicines.length === 0) { Alert.alert('Error', 'Please add at least one medicine'); return; }

    setIsSaving(true);
    try {
      const prescriptionData = {
        patientId,
        diagnosis,
        vitals: {
            bp: vitals.bp || undefined,
            weight: vitals.weight ? parseFloat(vitals.weight) : undefined,
            pulse: vitals.pulse ? parseInt(vitals.pulse) : undefined,
            temperature: vitals.temperature ? parseFloat(vitals.temperature) : undefined,
        },
        items: medicines.map(med => ({
          medicineName: med.name,
          genericName: med.genericName || undefined,
          dose: med.dose,
          frequency: med.frequency,
          timing: med.timing,
          days: med.days,
          instructions: med.instructions || undefined,
        })),
        aiSuggestionUsed: aiSuggestion !== null,
      };

      const result = await prescriptionsApi.create(prescriptionData);

      if (result.data) {
        Alert.alert('Success', 'Prescription saved successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to save prescription.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save prescription.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderInteractions = (interactions: any) => {
    if (!interactions) return null;
    if (typeof interactions === 'string') return <Text style={styles.interactionText}>{interactions}</Text>;

    const drugInt = interactions.drug || [];
    const brandInt = interactions.brand || [];
    const allInt = [...drugInt, ...brandInt];

    if (allInt.length === 0) return null;

    return (
      <View style={styles.interactionBox}>
        <Ionicons name="warning" size={12} color={Colors.red} />
        <Text style={styles.interactionText}>Known Interactions: {allInt.join(', ')}</Text>
      </View>
    );
  };

  // 5. Render
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
      
      {/* Header */}
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

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
        
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
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientMeta}>{patient.phone} · {patient.bloodGroup || 'Blood group unknown'}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.selectPatientBtn} onPress={() => router.push('/(app)/patients')}>
              <Ionicons name="person-add-outline" size={20} color={Colors.teal} />
              <Text style={styles.selectPatientText}>Select a patient</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Vitals Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pulse" size={14} color={Colors.teal} />
            <Text style={styles.sectionTitle}>VITALS</Text>
          </View>
          <View style={styles.vitalsRow}>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>BP</Text>
              <TextInput style={styles.vitalInput} placeholder="120/80" value={vitals.bp} onChangeText={(text) => setVitals({...vitals, bp: text})} />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Pulse</Text>
              <TextInput style={styles.vitalInput} placeholder="72" keyboardType="numeric" value={vitals.pulse} onChangeText={(text) => setVitals({...vitals, pulse: text})} />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Weight</Text>
              <TextInput style={styles.vitalInput} placeholder="65" keyboardType="numeric" value={vitals.weight} onChangeText={(text) => setVitals({...vitals, weight: text})} />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Temp</Text>
              <TextInput style={styles.vitalInput} placeholder="98.6" keyboardType="numeric" value={vitals.temperature} onChangeText={(text) => setVitals({...vitals, temperature: text})} />
            </View>
          </View>
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
          
          {/* SEARCH RESULTS & ADD NEW BUTTON */}
          {(searchResults.length > 0 || (searchQuery.length > 1 && !isSearching)) && (
            <View style={styles.searchResults}>
              {searchResults.map((med: any) => (
                <TouchableOpacity key={med.id} style={styles.searchItem} onPress={() => addMedicine(med)}>
                  <View>
                    <Text style={styles.searchItemName}>{med.name}</Text>
                    <Text style={styles.searchItemGeneric}>{med.saltComposition}</Text>
                  </View>
                  <Ionicons name="add-circle" size={20} color={Colors.teal} />
                </TouchableOpacity>
              ))}
              
              {/* --- ADD NEW MEDICINE BUTTON --- */}
              {searchResults.length === 0 && (
                <TouchableOpacity style={styles.addNewBtn} onPress={handleAddNewMedicine} disabled={isAddingNew}>
                  {isAddingNew ? (
                    <ActivityIndicator size="small" color={Colors.teal} />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={20} color={Colors.teal} />
                      <View>
                        <Text style={styles.addNewText}>Add "{searchQuery}" to Database</Text>
                        <Text style={styles.addNewSubText}>Details will be auto-filled later</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* SELECTED MEDICINES */}
          {medicines.map(med => (
            <View key={med.id} style={styles.medItem}>
              <View style={styles.medHeader}>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medGeneric}>{med.genericName || 'No composition'}</Text>
                </View>
                <TouchableOpacity onPress={() => removeMedicine(med.id)} style={styles.medDeleteBtn}>
                  <Ionicons name="close-circle" size={22} color={Colors.red} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.medDetails}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Dose</Text>
                  <TextInput style={styles.medFieldInput} value={med.dose} onChangeText={(text) => updateMedicine(med.id, 'dose', text)} placeholder="1-0-1" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Freq</Text>
                  <TextInput style={styles.medFieldInput} value={med.frequency} onChangeText={(text) => updateMedicine(med.id, 'frequency', text)} placeholder="Daily" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Days</Text>
                  <TextInput style={styles.medFieldInput} value={med.days.toString()} onChangeText={(text) => updateMedicine(med.id, 'days', parseInt(text) || 0)} keyboardType="numeric" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Timing</Text>
                  <TouchableOpacity style={styles.timingBtn} onPress={() => updateMedicine(med.id, 'timing', cycleTiming(med.timing))}>
                    <Text style={styles.timingText}>{med.timing.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.instructionsRow}>
                 <Ionicons name="information-circle-outline" size={14} color={Colors.muted} />
                 <TextInput 
                    style={styles.instructionsInput} 
                    value={med.instructions} 
                    onChangeText={(text) => updateMedicine(med.id, 'instructions', text)} 
                    placeholder="Add instructions (e.g. Take with warm water)" 
                    placeholderTextColor={Colors.muted}
                 />
              </View>
            </View>
          ))}
        </Card>

        {/* ========================================================== */}
        {/* DOCTOR'S REFERENCE CARD & AI CHECK */}
        {/* ========================================================== */}
        {medicines.length > 0 && (
          <View style={styles.referenceCard}>
            <View style={styles.refHeader}>
              <View style={{flexDirection:'row', alignItems:'center', gap:8, flex:1}}>
                <Ionicons name="shield-checkmark" size={14} color={Colors.white} />
                <Text style={styles.refTitle}>CLINICAL REFERENCE</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.aiCheckBtn} 
                onPress={handleCheckAIInteractions}
                disabled={isCheckingInteractions}
              >
                {isCheckingInteractions ? <ActivityIndicator size="small" color="#fff" /> : (
                   <><Ionicons name="sparkles" size={12} color="#fff" /><Text style={styles.aiCheckText}>Check Safety</Text></>
                )}
              </TouchableOpacity>
            </View>
            
            {/* AI RESULTS SECTION */}
            {aiInteractionWarnings && (
              <View style={styles.aiResultBox}>
                <Text style={styles.aiResultTitle}>AI Safety Report:</Text>
                {aiInteractionWarnings.map((warn, i) => (
                   <View key={i} style={styles.aiResultItem}>
                      <Ionicons name={warn.includes('✅') ? 'checkmark-circle' : 'warning'} size={14} color={warn.includes('✅') ? Colors.teal : Colors.red} />
                      <Text style={[styles.aiResultText, warn.includes('✅') && {color: Colors.teal}]}>{warn}</Text>
                   </View>
                ))}
              </View>
            )}

            {/* MEDICINE CLINICAL DETAILS */}
            {medicines.map((med, index) => (
              <View key={med.id} style={[styles.refItem, index !== medicines.length - 1 && styles.refItemBorder]}>
                
                <TouchableOpacity style={styles.refItemHeader} onPress={() => toggleExpand(med.id)}>
                   <View style={{flex:1}}>
                      <Text style={styles.refMedName}>{med.name}</Text>
                      <Text style={styles.refMedComp}>{med.genericName || 'Composition N/A'}</Text>
                   </View>
                   <Ionicons name={med.isExpanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.tealLight} />
                </TouchableOpacity>
                
                {med.isExpanded && (
                  <View style={styles.refExpandedContent}>
                    <Text style={styles.refLabel}>Description:</Text>
                    <Text style={styles.refDetail}>{med.description || 'Details not available in database.'}</Text>
                    <View style={{height:8}} />
                    <Text style={styles.refLabel}>Side Effects:</Text>
                    <Text style={styles.refDetail}>{med.sideEffects || 'No side effects listed.'}</Text>
                    {renderInteractions(med.interactions)}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
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
  
  // PATIENT STYLES
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  patientAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '600', color: Colors.navy },
  patientMeta: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  selectPatientBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing['2xl'], backgroundColor: Colors.tealPale, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.teal, borderStyle: 'dashed' },
  selectPatientText: { fontSize: Typography.fontSize.md, color: Colors.teal, fontWeight: '500' },
  
  // VITALS STYLES
  vitalsRow: { flexDirection: 'row', gap: 10 },
  vitalItem: { flex: 1 },
  vitalLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted, marginBottom: 4 },
  vitalInput: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: Colors.navy },

  // DIAGNOSIS & AI
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
  
  // MEDICINES LIST
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.teal, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 13, color: Colors.slate, padding: 0 },
  searchResults: { backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 10, ...Shadows.small },
  searchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchItemName: { fontSize: 13, fontWeight: '600', color: Colors.navy },
  searchItemGeneric: { fontSize: 11, color: Colors.muted },
  
  // ADD NEW BUTTON STYLES
  addNewBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  addNewText: { fontSize: 13, fontWeight: '600', color: Colors.teal },
  addNewSubText: { fontSize: 11, color: Colors.muted },

  medItem: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, marginBottom: 10 },
  medHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '600', color: Colors.navy },
  medGeneric: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  medDeleteBtn: { padding: 2 },
  medDetails: { flexDirection: 'row', gap: 10, flexWrap:'wrap' },
  fieldGroup: { flex: 1, minWidth: 60 },
  fieldLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted, marginBottom: 4 },
  medFieldInput: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12, textAlign: 'center', height:32 },
  timingBtn: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, alignItems:'center', justifyContent:'center', height:32 },
  timingText: { fontSize: 11, color: Colors.slate, textAlign: 'center' },
  instructionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: Colors.white, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border },
  instructionsInput: { flex: 1, fontSize: 12, color: Colors.navy, height: 36 },

  // DOCTOR REFERENCE CARD STYLES
  referenceCard: { backgroundColor: Colors.navy, borderRadius: 12, padding: 0, marginTop: 20, marginBottom: 20, overflow: 'hidden' },
  refHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', padding: 12 },
  refTitle: { fontSize: 12, fontWeight: '700', color: Colors.white, letterSpacing: 0.5 },
  
  // EXPANDABLE LIST ITEM STYLES
  refItem: { padding: 0 },
  refItemHeader: { flexDirection:'row', alignItems:'center', padding:12 },
  refExpandedContent: { paddingHorizontal:12, paddingBottom:12 },
  refItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  refMedName: { fontSize: 14, fontWeight: '700', color: Colors.tealLight, marginBottom: 2 },
  refMedComp: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  
  refDetail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  refLabel: { fontSize:11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginTop:4, marginBottom:2 },
  
  interactionBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: 8, borderRadius: 6 },
  interactionText: { fontSize: 11, color: '#FCA5A5', flex: 1, fontWeight: '600' },
  
  // AI BTN & RESULT STYLES
  aiCheckBtn: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:Colors.teal, paddingHorizontal:10, paddingVertical:6, borderRadius:12 },
  aiCheckText: { fontSize:11, color:'#fff', fontWeight:'600' },
  aiResultBox: { backgroundColor: '#1E293B', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  aiResultTitle: { color: Colors.tealLight, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  aiResultItem: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  aiResultText: { color: '#E2E8F0', fontSize: 12, flex: 1, lineHeight: 18 },
});