import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Users, CalendarCheck, Check, X, UserCheck } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { HrApi } from '../../api/hr.api';
import { LeaveRequestItem } from '../../api/employee.api';
import { UserProfile } from '../../api/auth.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const HrDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHrData = async () => {
    try {
      setLoading(true);
      const [empRes, leaveRes] = await Promise.allSettled([
        HrApi.getEmployees(),
        HrApi.getPendingLeaves(),
      ]);

      if (empRes.status === 'fulfilled' && empRes.value.success) {
        setEmployees(empRes.value.data || []);
      }
      if (leaveRes.status === 'fulfilled' && leaveRes.value.success) {
        setPendingLeaves(leaveRes.value.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHrData();
  }, []);

  const handleLeaveDecision = async (leaveId: string, decision: 'approved' | 'rejected') => {
    try {
      const res = await HrApi.updateLeaveStatus(leaveId, decision);
      if (res.success) {
        setPendingLeaves((prev) => prev.filter((l) => l._id !== leaveId));
        Alert.alert('Success', `Leave request ${decision}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update leave');
    }
  };

  return (
    <ScreenContainer refreshing={loading} onRefresh={loadHrData}>
      <Header
        title="HR Manager Portal"
        subtitle="People & Approvals Center"
        onPressNotification={() => navigation.navigate('Notifications')}
        onPressProfile={() => navigation.navigate('Profile')}
      />

      <View style={styles.metricsRow}>
        <StatCard
          title="Total Staff"
          value={employees.length}
          subtitle="Active directory"
          variant="primary"
          icon={<Users color={colors.primaryLight} size={20} />}
        />
        <StatCard
          title="Pending Leaves"
          value={pendingLeaves.length}
          subtitle="Needs review"
          variant="warning"
          icon={<CalendarCheck color={colors.warning} size={20} />}
        />
      </View>

      {/* Pending Leave Approvals Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Leave Approvals Queue</Text>
      </View>

      {pendingLeaves.length === 0 ? (
        <Card style={styles.emptyCard}>
          <UserCheck color={colors.success} size={32} />
          <Text style={styles.emptyText}>All leave requests are reviewed!</Text>
        </Card>
      ) : (
        pendingLeaves.map((req) => (
          <Card key={req._id} style={styles.leaveCard}>
            <View style={styles.leaveHeader}>
              <Text style={styles.empName}>Employee Request</Text>
              <Badge label={`${req.days} Days`} variant="warning" />
            </View>

            <Text style={styles.leaveDates}>
              {new Date(req.startDate).toLocaleDateString()} to {new Date(req.endDate).toLocaleDateString()}
            </Text>
            <Text style={styles.leaveReason}>{req.reason}</Text>

            <View style={styles.actionRow}>
              <Button
                title="Reject"
                variant="danger"
                size="sm"
                onPress={() => handleLeaveDecision(req._id, 'rejected')}
                style={styles.actionBtn}
              />
              <Button
                title="Approve"
                variant="primary"
                size="sm"
                onPress={() => handleLeaveDecision(req._id, 'approved')}
                style={styles.actionBtn}
              />
            </View>
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
  leaveCard: {
    marginBottom: spacing.sm,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  leaveDates: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    marginVertical: 4,
  },
  leaveReason: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: spacing.sm,
  },
  actionBtn: {
    marginLeft: spacing.sm,
    minWidth: 90,
  },
});
