import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Typography, Spacing } from '../../constants';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  containerStyle?: ViewStyle;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label, icon, error, containerStyle, rightIcon, onRightIconPress, ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused, error && styles.inputContainerError]}>
        {icon && <Ionicons name={icon} size={18} color={Colors.muted} />}
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.muted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...textInputProps}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress}>
            <Ionicons name={rightIcon} size={18} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing['2xl'] },
  label: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.slate, marginBottom: Spacing.sm, letterSpacing: 0.3, textTransform: 'uppercase' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, gap: Spacing.md },
  inputContainerFocused: { borderColor: Colors.teal },
  inputContainerError: { borderColor: Colors.red },
  input: { flex: 1, fontSize: Typography.fontSize.lg, color: Colors.slate, padding: 0 },
  error: { fontSize: Typography.fontSize.sm, color: Colors.red, marginTop: Spacing.xs },
});
