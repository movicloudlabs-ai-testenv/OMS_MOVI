import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  FolderKanban,
  Users,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ProjectItem } from '../../api/pmo.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const ProjectDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const projectParam: ProjectItem = route.params?.project || {
    _id: 'proj-1',
    name: 'Enterprise Cloud Core V2',
    key: 'ECC-2',
    description: 'Migration to modern multi-tenant backend architecture and mobile application rollout.',
    status: 'active',
    health: 'On Track',
    teamMembers: [
      { _id: 'u1', name: 'John Doe', role: 'Full Stack Engineer' },
      { _id: 'u2', name: 'Jane Smith', role: 'QA Lead' },
      { _id: 'u3', name: 'Robert Fox', role: 'UI/UX Designer' },
    ],
  };

  const [project, setProject] = useState<ProjectItem>(projectParam);

  const handleHealthChange = (newHealth: 'On Track' | 'At Risk' | 'Delayed') => {
    setProject((prev) => ({ ...prev, health: newHealth }));
    Alert.alert('Health Updated', `Project health status changed to "${newHealth}"`);
  };

  return (
    <ScreenContainer>
      {/* Top Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.dark.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          Project Roster & Health
        </Text>
        <Badge
          label={project.health || 'On Track'}
          variant={
            project.health === 'Delayed'
              ? 'danger'
              : project.health === 'At Risk'
              ? 'warning'
              : 'success'
          }
        />
      </View>

      {/* Main Project Card */}
      <Card style={styles.mainCard}>
        <Text style={styles.projTitle}>{project.name}</Text>
        <Text style={styles.projKey}>KEY: {project.key || 'OWMS-PROJ'}</Text>
        <Text style={styles.projDesc}>{project.description}</Text>

        <View style={styles.healthSection}>
          <Text style={styles.healthLabel}>PROJECT HEALTH STATUS</Text>
          <View style={styles.healthBtnRow}>
            {(['On Track', 'At Risk', 'Delayed'] as const).map((h) => (
              <TouchableOpacity
                key={h}
                style={[
                  styles.healthBtn,
                  project.health === h ? styles.activeHealthBtn : null,
                ]}
                onPress={() => handleHealthChange(h)}
              >
                <Text
                  style={[
                    styles.healthBtnText,
                    project.health === h ? styles.activeHealthBtnText : null,
                  ]}
                >
                  {h}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      {/* Team Roster */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Assigned Team Roster ({project.teamMembers?.length || 0})
        </Text>
      </View>

      {project.teamMembers?.map((member) => (
        <Card key={member._id} style={styles.memberCard}>
          <View style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.avatarInitials}>
                {member.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role || 'Contributor'}</Text>
            </View>
            <Badge label="Active" variant="success" />
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    flex: 1,
    marginLeft: spacing.sm,
  },
  mainCard: {
    marginBottom: spacing.md,
  },
  projTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  projKey: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  projDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  healthSection: {
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    paddingTop: spacing.sm,
  },
  healthLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textDim,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  healthBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.surfaceSubtle,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  activeHealthBtn: {
    backgroundColor: colors.primary,
  },
  healthBtnText: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    fontWeight: typography.fontWeight.medium,
  },
  activeHealthBtnText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.bold,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  memberCard: {
    marginBottom: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarInitials: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.xs,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  memberRole: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginTop: 1,
  },
});
