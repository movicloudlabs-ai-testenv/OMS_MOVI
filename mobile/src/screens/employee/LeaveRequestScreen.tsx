import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Calendar, Plus, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { AttachmentPicker } from '../../components/common/AttachmentPicker';
import { EmployeeApi, LeaveBalance, LeaveRequestItem } from '../../api/employee.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const LeaveRequestScreen: React.FC = () => {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balRes, reqRes] = await Promise.allSettled([
        EmployeeApi.getLeaveBalance(),
        EmployeeApi.getMyLeaveRequests(),
      ]);

      if (balRes.status === 'fulfilled' && balRes.value.success) {
        setBalance(balRes.value.data);
      }
      if (reqRes.status === 'fulfilled' && reqRes.value.success) {
        setRequests(reqRes.value.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = async () => {
    if (!startDate.trim() || !endDate.trim() || !reason.trim()) {
      Alert.alert('Missing Fields', 'Please specify start date, end date, and reason.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await EmployeeApi.applyLeave({
        leaveType,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        reason: reason.trim(),
      });

      if (res.success) {
        Alert.alert('Leave Submitted', 'Your leave request has been sent for manager approval.');
        setShowApplyForm(false);
        setStartDate('');
        setEndDate('');
        setReason('');
        loadData();
      }
    } catch (err: any) {
      Alert.alert('Submission Failed', err.response?.data?.message || 'Could not submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer refreshing={loading} onRefresh={loadData}>
      <Header title="Leave Portal" subtitle="Balance & Time-Off Management" />

      {/* Balance Summary Cards */}
      <View style={styles.balanceGrid}>
        <Card style={styles.balanceCard}>
          <Text style={styles.balTitle}>Casual</Text>
          <Text style={styles.balCount}>{balance?.casualLeave?.remaining ?? 0}</Text>
          <Text style={styles.balSub}>Remaining</Text>
        </Card>
        <Card style={styles.balanceCard}>
          <Text style={styles.balTitle}>Sick</Text>
          <Text style={styles.balCount}>{balance?.sickLeave?.remaining ?? 0}</Text>
          <Text style={styles.balSub}>Remaining</Text>
        </Card>
        <Card style={styles.balanceCard}>
          <Text style={styles.balTitle}>Earned</Text>
          <Text style={styles.balCount}>{balance?.earnedLeave?.remaining ?? 0}</Text>
          <Text style={styles.balSub}>Remaining</Text>
        </Card>
      </View>

      {/* Apply Leave Toggle */}
      <Button
        title={showApplyForm ? 'Cancel Application' : 'Apply for Leave'}
        variant={showApplyForm ? 'outline' : 'primary'}
        icon={showApplyForm ? undefined : <Plus color="#FFFFFF" size={18} />}
        onPress={() => setShowApplyForm(!showApplyForm)}
        style={styles.toggleBtn}
      />

      {/* Apply Form */}
      {showApplyForm ? (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>New Leave Application</Text>

          {/* Type Chips */}
          <View style={styles.typeRow}>
            {['casual', 'sick', 'earned', 'unpaid'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, leaveType === type ? styles.activeTypeChip : null]}
                onPress={() => setLeaveType(type)}
              >
                <Text style={[styles.typeText, leaveType === type ? styles.activeTypeText : null]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Start Date (YYYY-MM-DD)"
            placeholder="2026-09-10"
            value={startDate}
            onChangeText={setStartDate}
          />

          <Input
            label="End Date (YYYY-MM-DD)"
            placeholder="2026-09-12"
            value={endDate}
            onChangeText={setEndDate}
          />

          <Input
            label="Reason for Leave"
            placeholder="Attending family function..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
          />

          <AttachmentPicker
            imageUri={attachmentUri}
            onImageSelected={setAttachmentUri}
            label="Attach Medical Certificate / Proof (Optional)"
          />

          <Button
            title="Submit Leave Request"
            onPress={handleApply}
            loading={submitting}
            style={styles.submitBtn}
          />
        </Card>
      ) : null}

      {/* Recent Requests */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Leave Requests</Text>
      </View>

      {requests.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Calendar color={colors.dark.textDim} size={32} />
          <Text style={styles.emptyText}>No leave requests filed yet.</Text>
        </Card>
      ) : (
        requests.map((req) => (
          <Card key={req._id} style={styles.reqCard}>
            <View style={styles.reqHeader}>
              <Text style={styles.reqType}>{req.leaveType.toUpperCase()} LEAVE</Text>
              <Badge
                label={req.status}
                variant={
                  req.status === 'approved'
                    ? 'success'
                    : req.status === 'rejected'
                    ? 'danger'
                    : 'warning'
                }
              />
            </View>
            <Text style={styles.reqDates}>
              {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}
            </Text>
            <Text style={styles.reqReason} numberOfLines={2}>
              {req.reason}
            </Text>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  balanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  balanceCard: {
    flex: 1,
    marginHorizontal: 3,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  balTitle: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  balCount: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    marginVertical: 2,
  },
  balSub: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textDim,
  },
  toggleBtn: {
    marginBottom: spacing.md,
  },
  formCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  formTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.surfaceSubtle,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  activeTypeChip: {
    backgroundColor: colors.primary,
  },
  typeText: {
    color: colors.dark.textMuted,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
  activeTypeText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.bold,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.dark.textMuted,
    fontSize: typography.fontSize.sm,
    marginTop: 8,
  },
  reqCard: {
    marginBottom: spacing.sm,
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reqType: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  reqDates: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark.text,
    marginVertical: 4,
  },
  reqReason: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
  },
});
