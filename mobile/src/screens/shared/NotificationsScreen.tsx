import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, Check, Clock } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useNotifications } from '../../context/NotificationContext';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const NotificationsScreen: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <ScreenContainer refreshing={isLoading} onRefresh={refreshNotifications}>
      <Header title="Notifications" subtitle="System Updates & Mentions" />

      {unreadCount > 0 ? (
        <View style={styles.topActionRow}>
          <Text style={styles.unreadCountText}>{unreadCount} unread alert(s)</Text>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {notifications.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Bell color={colors.dark.textDim} size={36} />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySub}>You are all caught up!</Text>
        </Card>
      ) : (
        notifications.map((item) => (
          <TouchableOpacity
            key={item._id}
            activeOpacity={0.8}
            onPress={() => !item.isRead && markAsRead(item._id)}
          >
            <Card
              style={item.isRead ? styles.readCard : styles.unreadCard}
            >
              <View style={styles.notifHeader}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                {!item.isRead ? <Badge label="New" variant="danger" /> : null}
              </View>
              <Text style={styles.notifMessage}>{item.message}</Text>
              <Text style={styles.notifTime}>
                {new Date(item.createdAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  unreadCountText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
  },
  markAllText: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginTop: 2,
  },
  readCard: {
    marginBottom: spacing.xs,
    opacity: 0.8,
  },
  unreadCard: {
    marginBottom: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    flex: 1,
  },
  notifMessage: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textDim,
    marginTop: 6,
  },
});
