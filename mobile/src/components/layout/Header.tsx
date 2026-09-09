import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, Shield, User } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onPressNotification?: () => void;
  onPressProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onPressNotification,
  onPressProfile,
}) => {
  const { user, roleSlug } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {title ? (
          <>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.greeting}>Welcome back,</Text>
            <View style={styles.userRow}>
              <Text style={styles.userName}>{user?.name || 'Workspace User'}</Text>
              {roleSlug ? (
                <Badge
                  label={roleSlug.replace('-', ' ')}
                  variant="primary"
                  style={styles.roleBadge}
                />
              ) : null}
            </View>
          </>
        )}
      </View>

      <View style={styles.right}>
        {onPressNotification ? (
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={onPressNotification}
          >
            <Bell color={colors.dark.text} size={20} />
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}

        {onPressProfile ? (
          <TouchableOpacity
            style={[styles.iconButton, styles.profileButton]}
            activeOpacity={0.7}
            onPress={onPressProfile}
          >
            <User color={colors.primaryLight} size={20} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  left: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  roleBadge: {
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.textMuted,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    position: 'relative',
  },
  profileButton: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderColor: colors.primary,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    minWidth: 18,
    height: 18,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.dark.bg,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
});
