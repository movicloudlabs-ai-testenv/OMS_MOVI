import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, typography } from '../../styles/theme';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', style }) => {
  const getBadgeColors = () => {
    switch (variant) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: colors.success };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: colors.warning };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: colors.danger };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: colors.info };
      case 'primary':
        return { bg: 'rgba(79, 70, 229, 0.2)', text: colors.primaryLight };
      default:
        return { bg: colors.dark.surfaceSubtle, text: colors.dark.textMuted };
    }
  };

  const { bg, text } = getBadgeColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },
});
