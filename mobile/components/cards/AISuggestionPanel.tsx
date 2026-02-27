import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Typography, Spacing } from '../../constants';
import { AISuggestion } from '../../types';

interface AISuggestionPanelProps {
  suggestion?: AISuggestion | null;
  isLoading?: boolean;
  onAddMedicine?: (medicine: { name: string; genericName: string; dose: string }) => void;
}

export const AISuggestionPanel: React.FC<AISuggestionPanelProps> = ({ suggestion, isLoading = false, onAddMedicine }) => {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.badge}><Text style={styles.badgeText}>✨ AI</Text></View>
          <Text style={styles.title}>Analyzing...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.teal} />
          <Text style={styles.loadingText}>Getting suggestions from AI</Text>
        </View>
      </View>
    );
  }

  if (!suggestion) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}><Text style={styles.badgeText}>✨ AI</Text></View>
        <Text style={styles.title}>AI Suggestions</Text>
      </View>
      {suggestion.notes && <Text style={styles.notes}>{suggestion.notes}</Text>}
      {suggestion.medicines.length > 0 && (
        <View style={styles.medicines}>
          {suggestion.medicines.map((med, index) => (
            <TouchableOpacity key={index} style={styles.medicineChip} onPress={() => onAddMedicine?.(med)} activeOpacity={0.7}>
              <Text style={styles.medicineText}>+ {med.name} {med.dose}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {suggestion.warnings.length > 0 && (
        <View style={styles.warnings}>
          {suggestion.warnings.map((warning, index) => <Text key={index} style={styles.warningText}>⚠️ {warning}</Text>)}
        </View>
      )}
      <Text style={styles.disclaimer}>AI suggestions for reference only. Doctor's judgment applies.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.tealPale, borderWidth: 1.5, borderColor: Colors.tealMid, borderRadius: BorderRadius['2xl'], padding: 12, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  badge: { backgroundColor: Colors.teal, paddingHorizontal: 7, paddingVertical: 2, borderRadius: BorderRadius['4xl'] },
  badgeText: { fontSize: Typography.fontSize.xs, fontWeight: '700', color: Colors.white, letterSpacing: 0.5 },
  title: { fontSize: Typography.fontSize.md, fontWeight: '600', color: Colors.teal },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  loadingText: { fontSize: Typography.fontSize.base, color: Colors.slate },
  notes: { fontSize: Typography.fontSize.base, color: Colors.slate, lineHeight: 16, marginBottom: 6 },
  medicines: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  medicineChip: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.tealMid, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  medicineText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.teal },
  warnings: { marginTop: Spacing.md },
  warningText: { fontSize: Typography.fontSize.sm, color: Colors.amber, marginBottom: 2 },
  disclaimer: { fontSize: Typography.fontSize.xs, color: Colors.muted, fontStyle: 'italic', marginTop: Spacing.md, textAlign: 'center' },
});
