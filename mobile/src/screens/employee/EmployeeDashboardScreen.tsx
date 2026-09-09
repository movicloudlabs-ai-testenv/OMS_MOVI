import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  CheckSquare,
  Clock,
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  ArrowRight,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { EmployeeApi, TaskItem, AttendanceRecord, LeaveBalance } from '../../api/employee.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const EmployeeDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [tasksRes, attRes, leaveRes] = await Promise.allSettled([
        EmployeeApi.getMyTasks(),
        EmployeeApi.getTodayAttendance(),
        EmployeeApi.getLeaveBalance(),
      ]);

      if (tasksRes.status === 'fulfilled' && tasksRes.value.success) {
        setTasks(tasksRes.value.data || []);
      }
      if (attRes.status === 'fulfilled' && attRes.value.success) {
        setAttendance(attRes.value.data);
      }
      if (leaveRes.status === 'fulfilled' && leaveRes.value.success) {
        setLeaveBalance(leaveRes.value.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openTasksCount = tasks.filter((t) => t.status !== 'done').length;
  const inReviewCount = tasks.filter((t) => t.status === 'in-review').length;
  const totalLeaveLeft = leaveBalance
    ? leaveBalance.casualLeave.remaining +
      leaveBalance.sickLeave.remaining +
      leaveBalance.earnedLeave.remaining
    : 0;

  return (
    <ScreenContainer refreshing={loading} onRefresh={loadDashboardData}>
      <Header
        onPressNotification={() => navigation.navigate('Notifications')}
        onPressProfile={() => navigation.navigate('Profile')}
      />

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <StatCard
          title="Active Tasks"
          value={openTasksCount}
          subtitle={`${inReviewCount} in review`}
          variant="primary"
          icon={<CheckSquare color={colors.primaryLight} size={20} />}
        />
        <StatCard
          title="Leaves Left"
          value={totalLeaveLeft}
          subtitle="Available days"
          variant="info"
          icon={<Calendar color={colors.info} size={20} />}
        />
      </View>

      {/* Quick Attendance Banner */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Attendance')}
      >
        <Card style={styles.attendanceBanner}>
          <View style={styles.attBannerLeft}>
            <Clock color={colors.success} size={24} />
            <View style={styles.attBannerText}>
              <Text style={styles.attBannerTitle}>Today's Attendance</Text>
              <Text style={styles.attBannerSub}>
                {attendance?.checkIn
                  ? `Punched in at ${new Date(attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'You have not checked in yet today.'}
              </Text>
            </View>
          </View>
          <ArrowRight color={colors.dark.textMuted} size={18} />
        </Card>
      </TouchableOpacity>

      {/* Action Shortcuts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>
      <View style={styles.shortcutsRow}>
        <TouchableOpacity
          style={styles.shortcutBtn}
          onPress={() => navigation.navigate('Tasks')}
        >
          <CheckSquare color={colors.primaryLight} size={22} />
          <Text style={styles.shortcutText}>My Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shortcutBtn}
          onPress={() => navigation.navigate('Leaves')}
        >
          <Calendar color={colors.warning} size={22} />
          <Text style={styles.shortcutText}>Apply Leave</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shortcutBtn}
          onPress={() => navigation.navigate('EOD')}
        >
          <FileText color={colors.success} size={22} />
          <Text style={styles.shortcutText}>Daily EOD</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Tasks List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Priority Tasks</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {tasks.slice(0, 4).map((task) => (
        <Card key={task._id} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle} numberOfLines={1}>
              {task.title}
            </Text>
            <Badge
              label={task.priority}
              variant={
                task.priority === 'urgent' || task.priority === 'high'
                  ? 'danger'
                  : 'neutral'
              }
            />
          </View>
          <View style={styles.taskFooter}>
            <Text style={styles.taskProject}>
              {task.project?.name || 'General Task'}
            </Text>
            <Badge
              label={task.status.replace('-', ' ')}
              variant={
                task.status === 'done'
                  ? 'success'
                  : task.status === 'in-progress'
                  ? 'primary'
                  : 'warning'
              }
            />
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  attendanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: spacing.md,
  },
  attBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attBannerText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  attBannerTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark.text,
  },
  attBannerSub: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  viewAllText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
  },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: colors.dark.surface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  shortcutText: {
    color: colors.dark.text,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    marginTop: 6,
  },
  taskCard: {
    marginBottom: spacing.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  taskProject: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
  },
});
