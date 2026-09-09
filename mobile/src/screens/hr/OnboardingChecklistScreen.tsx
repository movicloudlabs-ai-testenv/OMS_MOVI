import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { UserCheck, CheckSquare, Square, ShieldCheck, Mail, Laptop, FileText } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

interface ChecklistStep {
  id: string;
  title: string;
  category: 'IT Setup' | 'HR Docs' | 'Security';
  completed: boolean;
}

export const OnboardingChecklistScreen: React.FC = () => {
  const [candidateName, setCandidateName] = useState('Alex Johnson (Software Engineer)');
  const [steps, setSteps] = useState<ChecklistStep[]>([
    { id: '1', title: 'Collect Government ID & Bank Details', category: 'HR Docs', completed: true },
    { id: '2', title: 'Sign NDA & Company Security Policy', category: 'Security', completed: true },
    { id: '3', title: 'Provision Corporate Laptop & VPN Access', category: 'IT Setup', completed: false },
    { id: '4', title: 'Invite to Slack Workspace & GitHub Org', category: 'IT Setup', completed: false },
    { id: '5', title: 'Assign PMO Project Mentor & HR Buddy', category: 'HR Docs', completed: false },
  ]);

  const toggleStep = (id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const handleFinishOnboarding = () => {
    if (completedCount < steps.length) {
      Alert.alert('Incomplete', 'Please check off all required onboarding steps before completing.');
      return;
    }
    Alert.alert('Onboarding Complete', 'Candidate status has been converted to Full Employee!');
  };

  return (
    <ScreenContainer>
      <Header title="Onboarding" subtitle="New Hire Verification Flow" />

      {/* Candidate Card */}
      <Card style={styles.candidateCard}>
        <View style={styles.cardHeader}>
          <UserCheck color={colors.primaryLight} size={22} />
          <Text style={styles.candidateName}>{candidateName}</Text>
          <Badge label={`${progressPercent}% Done`} variant={progressPercent === 100 ? 'success' : 'warning'} />
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {completedCount} of {steps.length} onboarding requirements satisfied
        </Text>
      </Card>

      {/* Steps List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Required Checklist Items</Text>
      </View>

      {steps.map((item) => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.8}
          onPress={() => toggleStep(item.id)}
        >
          <Card style={styles.stepCard}>
            <View style={styles.stepRow}>
              {item.completed ? (
                <CheckSquare color={colors.success} size={22} />
              ) : (
                <Square color={colors.dark.textDim} size={22} />
              )}
              <View style={styles.stepTextContainer}>
                <Text
                  style={[
                    styles.stepTitle,
                    item.completed ? styles.completedStepTitle : null,
                  ]}
                >
                  {item.title}
                </Text>
                <Badge label={item.category} variant="neutral" style={styles.stepCategory} />
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <Button
        title="Complete Onboarding & Activate User"
        onPress={handleFinishOnboarding}
        disabled={completedCount < steps.length}
        style={styles.finishBtn}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  candidateCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  candidateName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    flex: 1,
    marginLeft: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.dark.surfaceSubtle,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  stepCard: {
    marginBottom: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  stepTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.text,
    fontWeight: typography.fontWeight.medium,
  },
  completedStepTitle: {
    textDecorationLine: 'line-through',
    color: colors.dark.textDim,
  },
  stepCategory: {
    marginTop: 4,
  },
  finishBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
