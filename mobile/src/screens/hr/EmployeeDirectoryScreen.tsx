import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import {
  Users,
  Phone,
  Mail,
  Building,
  Shield,
  ArrowLeft,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { SearchBar } from '../../components/common/SearchBar';
import { HrApi } from '../../api/hr.api';
import { UserProfile } from '../../api/auth.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const EmployeeDirectoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await HrApi.getEmployees();
      if (res.success) {
        setEmployees(res.data || []);
      }
    } catch (e) {
      console.warn('Failed to load employees:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'Employee has no contact number listed.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = emp.name.toLowerCase().includes(query);
    const emailMatch = emp.email.toLowerCase().includes(query);
    const empIdMatch = emp.employeeId?.toLowerCase().includes(query);
    return nameMatch || emailMatch || empIdMatch;
  });

  return (
    <ScreenContainer refreshing={loading} onRefresh={fetchStaff}>
      <Header title="Staff Directory" subtitle="Company Employee Index" />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by name, email, or employee ID..."
      />

      {filteredEmployees.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Users color={colors.dark.textDim} size={40} />
          <Text style={styles.emptyTitle}>No employees found</Text>
          <Text style={styles.emptySub}>Try searching with a different term.</Text>
        </Card>
      ) : (
        filteredEmployees.map((emp) => {
          const roleLabel =
            typeof emp.role === 'object' && emp.role.name
              ? emp.role.name
              : typeof emp.role === 'string'
              ? emp.role
              : 'Employee';

          return (
            <Card key={emp._id} style={styles.empCard}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarMini}>
                  <Text style={styles.avatarInitials}>
                    {emp.name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{emp.name}</Text>
                  <Text style={styles.empEmail}>{emp.email}</Text>
                </View>

                <Badge label={roleLabel} variant="primary" />
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.empId}>ID: {emp.employeeId || 'EMP-2026'}</Text>
                <Text style={styles.designation}>{emp.designation || 'Staff Member'}</Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleEmail(emp.email)}
                >
                  <Mail color={colors.primaryLight} size={16} />
                  <Text style={styles.actionBtnText}>Email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleCall(emp.phone)}
                >
                  <Phone color={colors.success} size={16} />
                  <Text style={styles.actionBtnText}>Call</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginTop: 2,
  },
  empCard: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  },
  empInfo: {
    flex: 1,
  },
  empName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  empEmail: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  empId: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textDim,
  },
  designation: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  actionIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surfaceSubtle,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    marginLeft: spacing.xs,
  },
  actionBtnText: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.text,
    marginLeft: 6,
    fontWeight: typography.fontWeight.medium,
  },
});
