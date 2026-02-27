/**
 * DocAssist Design System
 */

export const Colors = {
  teal: '#0A7B6E',
  tealLight: '#0FA68E',
  tealPale: '#E6F5F3',
  tealMid: '#B2DED9',
  navy: '#0D1B2A',
  slate: '#2C3E50',
  muted: '#6B7C93',
  border: '#DCE4ED',
  background: '#F5F8FA',
  white: '#FFFFFF',
  red: '#E05A4E',
  amber: '#F59E0B',
  green: '#16A34A',
  purple: '#7C3AED',
  badgeNew: { bg: '#FEF3C7', text: '#92400E' },
  badgeFollowUp: { bg: '#E0F2FE', text: '#0369A1' },
  badgeDiabetic: { bg: '#FEE2E2', text: '#B91C1C' },
  badgeHypertensive: { bg: '#E0F2FE', text: '#0369A1' },
};

export const Shadows = {
  small: {
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  large: {
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 8,
  },
};

export const Typography = {
  fontFamily: {
    serif: 'System',
    sans: 'System',
    sansMedium: 'System',
    sansSemiBold: 'System',
    sansBold: 'System',
  },
  fontSize: {
    xs: 9,
    sm: 10,
    base: 11,
    md: 12,
    lg: 13,
    xl: 14,
    '2xl': 15,
    '3xl': 16,
    '4xl': 18,
    '5xl': 20,
    '6xl': 22,
    '7xl': 28,
  },
};

export const Spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 14,
  '3xl': 16,
  '4xl': 18,
  '5xl': 20,
  '6xl': 24,
  '7xl': 28,
  '8xl': 32,
  '9xl': 36,
  '10xl': 40,
};

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 14,
  '3xl': 16,
  '4xl': 20,
  full: 9999,
};

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
