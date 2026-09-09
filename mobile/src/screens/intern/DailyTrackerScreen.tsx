import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Clock, Plus, Send, CheckCircle } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const DailyTrackerScreen: React.FC = () => {
  const [hoursSpent, setHoursSpent] = useState('8');
  const [tasksDone, setTasksDone] = useState('');
  const [learningTakeaway, setLearningTakeaway] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleLogHours = () => {
    if (!tasksDone.trim() || !learningTakeaway.trim()) {
      Alert.alert('Required Fields', 'Please describe your daily tasks and key learning takeaways.');
      return;
    }
    setSubmitted(true);
    Alert.alert('Logged Successfully', 'Daily tracker hours recorded for your internship evaluation.');
  };

  return (
    <ScreenContainer>
      <Header title="Daily Activity Tracker" subtitle="Internship Hours & Key Learnings" />

      {submitted ? (
        <Card style={styles.successCard}>
          <CheckCircle color={colors.success} size={44} />
          <Text style={styles.successTitle}>Daily Hours Logged!</Text>
          <Text style={styles.successSub}>
            Your mentor and HR lead have received today's timesheet submission.
          </Text>
          <Button
            title="Log Another Entry"
            variant="outline"
            onPress={() => setSubmitted(false)}
            style={styles.anotherBtn}
          />
        </Card>
      ) : (
        <Card style={styles.formCard}>
          <Input
            label="Total Hours Worked Today"
            placeholder="8"
            keyboardType="numeric"
            value={hoursSpent}
            onChangeText={setHoursSpent}
          />

          <Input
            label="Tasks Completed"
            placeholder="Built mobile task details component, fixed API bug..."
            value={tasksDone}
            onChangeText={setTasksDone}
            multiline
            numberOfLines={3}
          />

          <Input
            label="Key Learning / Skills Acquired"
            placeholder="Learned how Expo Location detects mock GPS providers..."
            value={learningTakeaway}
            onChangeText={setLearningTakeaway}
            multiline
            numberOfLines={3}
          />

          <Button
            title="Submit Daily Log"
            onPress={handleLogHours}
            icon={<Send color="#FFFFFF" size={16} />}
            style={styles.submitBtn}
          />
        </Card>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  formCard: {
    padding: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  successTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    marginTop: spacing.sm,
  },
  successSub: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  anotherBtn: {
    minWidth: 180,
  },
});
