import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldAlert, Users, Layers, Activity, FileText } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { AdminApi, AuditLogItem } from '../../api/admin.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const AdminDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProjects: 0,
    todayAttendance: 0,
    pendingLeaves: 0,
  });
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.allSettled([
        AdminApi.getSystemStats(),
        AdminApi.getAuditLogs(1, 10),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setStats(statsRes.value.data);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value.success) {
        setLogs(logsRes.value.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  return (
    <ScreenContainer refreshing={loading} onRefresh={loadAdminData}>
      <Header
        title="Admin Console"
        subtitle="System Health & Security"
        onPressNotification={() => navigation.navigate('Notifications')}
        onPressProfile={() => navigation.navigate('Profile')}
      />

      <View style={styles.metricsRow}>
        <StatCard
          title="Users"
          value={stats.totalUsers || 12}
          subtitle="Registered accounts"
          variant="primary"
          icon={<Users color={colors.primaryLight} size={20} />}
        />
        <StatCard
          title="System Status"
          value="Healthy"
          subtitle="All microservices active"
          variant="success"
          icon={<Activity color={colors.success} size={20} />}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Live Security Audit Log</Text>
      </View>

      {logs.length === 0 ? (
        <Card style={styles.emptyCard}>
          <FileText color={colors.dark.textDim} size={32} />
          <Text style={styles.emptyText}>No recent audit entries.</Text>
        </Card>
      ) : (
        logs.map((log) => (
          <Card key={log._id} style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={styles.logAction}>{log.action} - {log.module}</Text>
              <Badge label="Logged" variant="info" />
            </View>
            <Text style={styles.logUser}>
              By: {log.user?.name || 'System Admin'} ({log.user?.email || 'admin'})
            </Text>
            <Text style={styles.logTime}>
              {new Date(log.createdAt).toLocaleString()}
            </Text>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    color: colors.dark.textMuted,
    fontSize: typography.fontSize.sm,
    marginTop: 6,
  },
  logCard: {
    marginBottom: spacing.xs,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logAction: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  logUser: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.text,
    marginTop: 2,
  },
  logTime: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textDim,
    marginTop: 2,
  },
});
