import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Typography } from '../../constants';

type BadgeVariant = 'new' | 'followUp' | 'diabetic' | 'hypertensive' | 'success' | 'warning' | 'error' | 'info' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  new: Colors.badgeNew,
  followUp: Colors.badgeFollowUp,
  diabetic: Colors.badgeDiabetic,
  hypertensive: Colors.badgeHypertensive,
  success: { bg: '#DCFCE7', text: '#166534' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  error: { bg: '#FEE2E2', text: '#B91C1C' },
  info: { bg: '#E0F2FE', text: '#0369A1' },
  default: { bg: Colors.tealPale, text: Colors.teal },
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', size = 'sm', style }) => {
  const colors = variantStyles[variant];

  return (
    <View style={[styles.badge, size === 'md' && styles.badgeMd, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, size === 'md' && styles.textMd, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius['4xl'] },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: Typography.fontSize.xs, fontWeight: '600' },
  textMd: { fontSize: Typography.fontSize.sm },
});
