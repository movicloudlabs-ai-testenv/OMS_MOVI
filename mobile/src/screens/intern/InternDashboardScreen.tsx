import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BookOpen, CheckSquare, Clock, ArrowRight } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { EmployeeApi, TaskItem } from '../../api/employee.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const InternDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const res = await EmployeeApi.getMyTasks();
        if (res.success) {
          setTasks(res.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  return (
    <ScreenContainer refreshing={loading}>
      <Header
        title="Intern Hub"
        subtitle="Learning & Deliverables"
        onPressNotification={() => navigation.navigate('Notifications')}
        onPressProfile={() => navigation.navigate('Profile')}
      />

      <View style={styles.metricsRow}>
        <StatCard
          title="Assigned Tasks"
          value={tasks.length}
          subtitle="Learning backlog"
          variant="primary"
          icon={<CheckSquare color={colors.primaryLight} size={20} />}
        />
        <StatCard
          title="Curriculum"
          value="Week 3"
          subtitle="Full-Stack Pathway"
          variant="info"
          icon={<BookOpen color={colors.info} size={20} />}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Learning Milestones</Text>
      </View>

      <Card style={styles.curriculumCard}>
        <Text style={styles.currTitle}>Module 3: Enterprise APIs & MongoDB Aggregations</Text>
        <Text style={styles.currSub}>Assigned by HR & PMO Lead</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar} />
        </View>
        <Text style={styles.progressText}>75% Completed</Text>
      </Card>
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
  curriculumCard: {
    padding: spacing.md,
  },
  currTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  currSub: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  progressContainer: {
    height: 8,
    backgroundColor: colors.dark.surfaceSubtle,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    width: '75%',
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
  },
});
