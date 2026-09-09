import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FolderKanban, CheckCircle, AlertTriangle, Layers, ArrowRight } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { PmoApi, ProjectItem } from '../../api/pmo.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const PmoDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPmoData = async () => {
    try {
      setLoading(true);
      const res = await PmoApi.getProjects();
      if (res.success) {
        setProjects(res.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPmoData();
  }, []);

  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const onTrackProjects = projects.filter((p) => p.health === 'On Track').length;

  return (
    <ScreenContainer refreshing={loading} onRefresh={loadPmoData}>
      <Header
        title="PMO Workspace"
        subtitle="Project & Sprint Operations"
        onPressNotification={() => navigation.navigate('Notifications')}
        onPressProfile={() => navigation.navigate('Profile')}
      />

      <View style={styles.metricsRow}>
        <StatCard
          title="Active Projects"
          value={activeProjects}
          subtitle={`${projects.length} Total`}
          variant="primary"
          icon={<FolderKanban color={colors.primaryLight} size={20} />}
        />
        <StatCard
          title="Health Rating"
          value={`${onTrackProjects}/${projects.length || 1}`}
          subtitle="On Track"
          variant="success"
          icon={<CheckCircle color={colors.success} size={20} />}
        />
      </View>

      {/* Projects List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Managed Projects</Text>
      </View>

      {projects.map((proj) => (
        <Card key={proj._id} style={styles.projectCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.projectTitle}>{proj.name}</Text>
            <Badge
              label={proj.health || 'On Track'}
              variant={
                proj.health === 'Delayed'
                  ? 'danger'
                  : proj.health === 'At Risk'
                  ? 'warning'
                  : 'success'
              }
            />
          </View>

          {proj.description ? (
            <Text style={styles.projDesc} numberOfLines={2}>
              {proj.description}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            <Text style={styles.teamCount}>
              👥 {proj.teamMembers?.length || 0} Team Members
            </Text>
            <Badge label={proj.status} variant="neutral" />
          </View>
        </Card>
      ))}
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
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  projectCard: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  projectTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    flex: 1,
    marginRight: 8,
  },
  projDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  teamCount: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
  },
});
