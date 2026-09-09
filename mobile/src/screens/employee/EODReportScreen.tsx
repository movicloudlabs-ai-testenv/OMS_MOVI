import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { FileText, Send, CheckCircle2 } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { EmployeeApi } from '../../api/employee.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const EODReportScreen: React.FC = () => {
  const [summary, setSummary] = useState('');
  const [blockers, setBlockers] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!summary.trim()) {
      Alert.alert('Required', 'Please enter your day work summary.');
      return;
    }

    try {
      setSubmitting(true);
      await EmployeeApi.submitEOD({
        summary: summary.trim(),
        tasksCompleted: [],
        blockers: blockers.trim(),
      });
      setSubmitted(true);
      Alert.alert('Success', 'End-of-Day report submitted successfully!');
    } catch (err: any) {
      Alert.alert('Submission Failed', err.response?.data?.message || 'Failed to submit EOD report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Header title="Daily EOD Report" subtitle="End of Day Progress Submission" />

      {submitted ? (
        <Card style={styles.successCard}>
          <CheckCircle2 color={colors.success} size={48} />
          <Text style={styles.successTitle}>Report Submitted!</Text>
          <Text style={styles.successSub}>
            Your manager and HR have received your daily report.
          </Text>
          <Button
            title="Submit Another Update"
            variant="outline"
            onPress={() => setSubmitted(false)}
            style={styles.anotherBtn}
          />
        </Card>
      ) : (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Today's Summary</Text>

          <Input
            label="What did you work on today?"
            placeholder="Detailed accomplishments, PRs merged, meetings..."
            value={summary}
            onChangeText={setSummary}
            multiline
            numberOfLines={5}
            style={styles.textArea}
          />

          <Input
            label="Any blockers or pending items for tomorrow?"
            placeholder="Waiting on client API keys / backend review..."
            value={blockers}
            onChangeText={setBlockers}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />

          <Button
            title="Submit EOD Report"
            onPress={handleSubmit}
            loading={submitting}
            icon={<Send color="#FFFFFF" size={18} />}
            style={styles.submitBtn}
          />
        </Card>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  formCard: {
    padding: spacing.lg,
  },
  formTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  successTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    marginTop: spacing.md,
  },
  successSub: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  anotherBtn: {
    minWidth: 200,
  },
});
