import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Typography } from '../../constants';

interface StatCardProps {
  value: number | string;
  label: string;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius.xl, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  value: { color: Colors.white, fontSize: Typography.fontSize['5xl'], fontWeight: '700' },
  label: { color: 'rgba(255,255,255,0.55)', fontSize: Typography.fontSize.xs, marginTop: 2 },
});
