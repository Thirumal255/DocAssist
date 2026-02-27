import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '../../constants';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  emoji?: string;
  style?: ViewStyle;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const sizeMap = {
  sm: { container: 28, text: 11, emoji: 14 },
  md: { container: 36, text: 14, emoji: 18 },
  lg: { container: 48, text: 18, emoji: 22 },
  xl: { container: 56, text: 22, emoji: 26 },
};

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 'md', emoji, style }) => {
  const dimensions = sizeMap[size];

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: dimensions.container, height: dimensions.container, borderRadius: size === 'xl' ? BorderRadius['3xl'] : BorderRadius.full }, style]}
      />
    );
  }

  return (
    <View style={[styles.container, { width: dimensions.container, height: dimensions.container, borderRadius: size === 'xl' ? BorderRadius['3xl'] : BorderRadius.full }, style]}>
      {emoji ? (
        <Text style={{ fontSize: dimensions.emoji }}>{emoji}</Text>
      ) : (
        <Text style={[styles.initials, { fontSize: dimensions.text }]}>{name ? getInitials(name) : '?'}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  image: { resizeMode: 'cover' },
  initials: { color: Colors.white, fontWeight: '700' },
});
