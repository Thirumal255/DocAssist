import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Typography, Shadows } from '../../constants';

interface QuickActionCardProps {
  icon: string;
  label: string;
  backgroundColor?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({ icon, label, backgroundColor = Colors.tealPale, onPress, style }) => {
  return (
    <TouchableOpacity style={[styles.container, style]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.iconContainer, { backgroundColor }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.white, borderRadius: BorderRadius['2xl'], padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, ...Shadows.small },
  iconContainer: { width: 36, height: 36, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 16 },
  label: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.slate, lineHeight: 15, flex: 1 },
});
