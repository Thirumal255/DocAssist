import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Shadows } from '../../constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outline';
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, variant = 'default' }) => {
  const cardStyle = [styles.base, variant === 'elevated' && styles.elevated, variant === 'outline' && styles.outline, style];

  if (onPress) {
    return <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.8}>{children}</TouchableOpacity>;
  }
  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: { backgroundColor: Colors.white, borderRadius: BorderRadius['2xl'], padding: 14, ...Shadows.small },
  elevated: { ...Shadows.large },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.border, shadowOpacity: 0, elevation: 0 },
});
