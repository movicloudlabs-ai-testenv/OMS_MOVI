import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { colors, typography, spacing, borderRadius } from '../../styles/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'info';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'primary',
}) => {
  const getIconBg = () => {
    switch (variant) {
      case 'success':
        return 'rgba(16, 185, 129, 0.15)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.15)';
      case 'info':
        return 'rgba(59, 130, 246, 0.15)';
      default:
        return 'rgba(79, 70, 229, 0.15)';
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.value}>{value}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {icon ? <View style={[styles.iconContainer, { backgroundColor: getIconBg() }]}>{icon}</View> : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: typography.fontSize.xl,
    color: colors.dark.text,
    fontWeight: typography.fontWeight.bold,
    marginTop: 2,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textDim,
    marginTop: 2,
  },
  iconContainer: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
});
