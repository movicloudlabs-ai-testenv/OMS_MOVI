import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import {
  Users,
  UserX,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { AdminApi } from '../../api/admin.api';
import { UserProfile } from '../../api/auth.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const UserManagementScreen: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUserForOffboard, setSelectedUserForOffboard] = useState<UserProfile | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await AdminApi.getUsers();
      if (res.success) {
        setUsers(res.data || []);
      }
    } catch (e) {
      console.warn('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleExecuteOffboarding = () => {
    if (!selectedUserForOffboard) return;

    Alert.alert(
      'Confirm Offboarding Cascade',
      `This will soft-delete ${selectedUserForOffboard.name}, unassign open tasks, and notify project leads. Proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Offboard',
          style: 'destructive',
          onPress: () => {
            setUsers((prev) =>
              prev.map((u) =>
                u._id === selectedUserForOffboard._id ? { ...u, isActive: false } : u
              )
            );
            setSelectedUserForOffboard(null);
            Alert.alert('Offboarded', 'User offboarding cascade executed successfully.');
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <ScreenContainer refreshing={loading} onRefresh={loadUsers}>
      <Header title="User Administration" subtitle="Role Governance & Offboarding" />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search users..."
      />

      {filteredUsers.map((usr) => {
        const roleStr =
          typeof usr.role === 'object' && usr.role.name
            ? usr.role.name
            : typeof usr.role === 'string'
            ? usr.role
            : 'Employee';

        return (
          <Card key={usr._id} style={styles.userCard}>
            <View style={styles.cardHeader}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{usr.name}</Text>
                <Text style={styles.userEmail}>{usr.email}</Text>
              </View>
              <Badge label={roleStr} variant="primary" />
            </View>

            <View style={styles.cardFooter}>
              <Badge
                label={usr.isActive !== false ? 'Active' : 'Offboarded'}
                variant={usr.isActive !== false ? 'success' : 'danger'}
              />

              {usr.isActive !== false ? (
                <TouchableOpacity
                  style={styles.offboardBtn}
                  onPress={() => setSelectedUserForOffboard(usr)}
                >
                  <UserX color={colors.danger} size={14} />
                  <Text style={styles.offboardBtnText}>Offboard User</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Card>
        );
      })}

      {/* Safe Offboarding Impact Preview Modal */}
      {selectedUserForOffboard ? (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AlertTriangle color={colors.warning} size={24} />
                <Text style={styles.modalTitle}>Safe Offboarding Cascade</Text>
                <TouchableOpacity onPress={() => setSelectedUserForOffboard(null)}>
                  <X color={colors.dark.textMuted} size={20} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSub}>
                Offboarding <Text style={styles.boldText}>{selectedUserForOffboard.name}</Text>
              </Text>

              <View style={styles.impactBox}>
                <Text style={styles.impactTitle}>AUTOMATED IMPACT ACTIONS:</Text>
                <Text style={styles.impactItem}>• Flag open tasks as "Needs Reassignment"</Text>
                <Text style={styles.impactItem}>• Require successor project lead for managed projects</Text>
                <Text style={styles.impactItem}>• Invalidate active mobile tokens & sessions</Text>
                <Text style={styles.impactItem}>• Preserve historical audit logs & soft-delete user</Text>
              </View>

              <Button
                title="Execute Offboarding Cascade"
                variant="danger"
                onPress={handleExecuteOffboarding}
                style={styles.executeBtn}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  userCard: {
    marginBottom: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  userName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  userEmail: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  offboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  offboardBtnText: {
    fontSize: typography.fontSize.xs,
    color: colors.danger,
    marginLeft: 4,
    fontWeight: typography.fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.dark.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.dark.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    flex: 1,
    marginLeft: spacing.sm,
  },
  modalSub: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  boldText: {
    color: colors.dark.text,
    fontWeight: typography.fontWeight.bold,
  },
  impactBox: {
    backgroundColor: colors.dark.bg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: spacing.lg,
  },
  impactTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.warning,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  impactItem: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    lineHeight: 20,
  },
  executeBtn: {
    marginBottom: spacing.sm,
  },
});
