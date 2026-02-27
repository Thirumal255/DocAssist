import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Typography, Shadows } from '../../constants';
import { Badge } from '../ui/Badge';
import { Appointment } from '../../types';

interface AppointmentCardProps {
  appointment: Appointment;
  onPress: () => void;
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onPress }) => {
  const { patient, scheduledAt, type } = appointment;
  const badgeVariant = type === 'new' ? 'new' : 'followUp';
  const badgeLabel = type === 'new' ? 'New' : 'Follow-up';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.timeContainer}>
        <Text style={styles.time}>{formatTime(scheduledAt)}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{patient?.name || 'Unknown Patient'}</Text>
        <Text style={styles.type}>{appointment.chiefComplaint || 'General Checkup'}</Text>
      </View>
      <Badge label={badgeLabel} variant={badgeVariant} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, ...Shadows.small },
  timeContainer: { backgroundColor: Colors.tealPale, paddingHorizontal: 7, paddingVertical: 4, borderRadius: BorderRadius.sm },
  time: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.teal },
  infoContainer: { flex: 1 },
  name: { fontSize: Typography.fontSize.md, fontWeight: '600', color: Colors.navy },
  type: { fontSize: Typography.fontSize.sm, color: Colors.muted },
});
