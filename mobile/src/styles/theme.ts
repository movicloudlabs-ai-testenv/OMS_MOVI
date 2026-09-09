export const colors = {
  // Brand Primary (Indigo/Blue enterprise palette)
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#818CF8',
  primaryBg: '#EEF2FF',

  // Status & Accents
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Neutrals / Dark Enterprise Surfaces
  dark: {
    bg: '#0F172A',
    surface: '#1E293B',
    surfaceSubtle: '#334155',
    border: '#334155',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textDim: '#64748B',
  },
  light: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    textDim: '#94A3B8',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
