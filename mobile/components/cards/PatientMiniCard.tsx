import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Patient, Vitals } from '../../types';

interface PatientMiniCardProps {
  patient: Patient;
  vitals?: Vitals;
  lastVisitDate?: string;
}

export const PatientMiniCard: React.FC<PatientMiniCardProps> = ({ patient, vitals, lastVisitDate }) => {
  const genderShort = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'O';

  return (
    <View style={styles.container}>
      <Avatar emoji={patient.gender === 'female' ? '👩' : '👨'} size="lg" style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{patient.name}, {patient.age}{genderShort}</Text>
        <Text style={styles.meta}>
          {vitals?.bp && `BP: ${vitals.bp}`}
          {vitals?.weight && ` · Wt: ${vitals.weight}kg`}
          {lastVisitDate && ` · Last visit: ${lastVisitDate}`}
        </Text>
        {(patient.chronicConditions?.length > 0) && (
          <View style={styles.tags}>
            {patient.chronicConditions?.includes('diabetes') && <Badge label="Diabetic" variant="diabetic" />}
            {patient.chronicConditions?.includes('hypertension') && <Badge label="Hypertensive" variant="hypertensive" />}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  avatar: { backgroundColor: Colors.tealPale },
  info: { flex: 1 },
  name: { fontSize: Typography.fontSize.lg, fontWeight: '600', color: Colors.navy },
  meta: { fontSize: Typography.fontSize.sm, color: Colors.muted, marginTop: 2 },
  tags: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
});
