import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Typography, Shadows } from '../../constants';
import { Visit } from '../../types';

interface TimelineCardProps {
  visit: Visit;
  isFirst?: boolean;
  isLast?: boolean;
  onPress?: () => void;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const TimelineCard: React.FC<TimelineCardProps> = ({ visit, isFirst = false, isLast = false, onPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.timeline}>
        <View style={[styles.dot, !isFirst && styles.dotInactive]} />
        {!isLast && <View style={styles.line} />}
      </View>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.8 : 1} disabled={!onPress}>
        <Text style={styles.date}>{formatDate(visit.visitedAt)} — {visit.doctor?.name || 'Dr.'}</Text>
        <Text style={styles.diagnosis}>{visit.diagnosis || 'General checkup'}</Text>
        {visit.prescription?.items && visit.prescription.items.length > 0 && (
          <Text style={styles.drugs}>{visit.prescription.items.map(item => `${item.medicineName} ${item.dose}`).join(' · ')}</Text>
        )}
        <Text style={styles.viewLink}>📄 View Prescription</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  timeline: { alignItems: 'center', width: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.teal, marginTop: 2 },
  dotInactive: { backgroundColor: Colors.muted },
  line: { width: 1.5, flex: 1, backgroundColor: Colors.border, marginTop: 4 },
  card: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 10, ...Shadows.small },
  date: { fontSize: Typography.fontSize.xs, color: Colors.muted, marginBottom: 4 },
  diagnosis: { fontSize: Typography.fontSize.md, fontWeight: '600', color: Colors.navy },
  drugs: { fontSize: Typography.fontSize.sm, color: Colors.muted, marginTop: 3 },
  viewLink: { fontSize: Typography.fontSize.xs, color: Colors.teal, marginTop: 5 },
});
