import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors, BorderRadius, Typography, Shadows } from '../../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title, onPress, variant = 'primary', size = 'md', disabled = false, loading = false, icon, style, textStyle,
}) => {
  const buttonStyles = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'outline' && styles.outline,
    variant === 'ghost' && styles.ghost,
    size === 'sm' && styles.sizeSm,
    size === 'md' && styles.sizeMd,
    size === 'lg' && styles.sizeLg,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    variant === 'primary' && styles.textPrimary,
    variant === 'outline' && styles.textOutline,
    variant === 'ghost' && styles.textGhost,
    size === 'sm' && styles.textSm,
    size === 'md' && styles.textMd,
    size === 'lg' && styles.textLg,
    textStyle,
  ];

  return (
    <TouchableOpacity style={buttonStyles} onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.teal} size="small" />
      ) : (
        <>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.xl, gap: 8 },
  primary: { backgroundColor: Colors.teal, ...Shadows.small },
  outline: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.teal },
  ghost: { backgroundColor: 'transparent' },
  sizeSm: { paddingVertical: 8, paddingHorizontal: 14 },
  sizeMd: { paddingVertical: 12, paddingHorizontal: 18 },
  sizeLg: { paddingVertical: 14, paddingHorizontal: 24 },
  disabled: { opacity: 0.5 },
  text: { fontWeight: '600', textAlign: 'center' },
  textPrimary: { color: Colors.white },
  textOutline: { color: Colors.teal },
  textGhost: { color: Colors.teal },
  textSm: { fontSize: Typography.fontSize.md },
  textMd: { fontSize: Typography.fontSize.xl },
  textLg: { fontSize: Typography.fontSize['2xl'] },
  icon: { fontSize: 16 },
});
