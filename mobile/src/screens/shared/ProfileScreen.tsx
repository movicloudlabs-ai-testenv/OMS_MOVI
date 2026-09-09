import React from 'react';
import { View, Text, StyleSheet, Switch, Alert, TouchableOpacity } from 'react-native';
import { User, Mail, Shield, LogOut, Fingerprint, Key, Building2 } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const ProfileScreen: React.FC = () => {
  const { user, roleSlug, logout, isBiometricAvailable, isBiometricEnabled, toggleBiometric } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of Movi OWMS?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleBiometricToggle = async (val: boolean) => {
    await toggleBiometric(val);
  };

  return (
    <ScreenContainer>
      <Header title="My Profile" subtitle="Account & Security Settings" />

      {/* User Info Card */}
      <Card style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <User color={colors.primaryLight} size={40} />
        </View>
        <Text style={styles.userName}>{user?.name || 'Workspace Member'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Badge
          label={roleSlug ? roleSlug.replace('-', ' ') : 'Employee'}
          variant="primary"
          style={styles.roleBadge}
        />
      </Card>

      {/* Corporate Metadata */}
      <Card style={styles.detailsCard}>
        <View style={styles.infoRow}>
          <Building2 color={colors.dark.textMuted} size={18} />
          <Text style={styles.infoKey}>Employee ID:</Text>
          <Text style={styles.infoVal}>{user?.employeeId || 'EMP-2026'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Shield color={colors.dark.textMuted} size={18} />
          <Text style={styles.infoKey}>Designation:</Text>
          <Text style={styles.infoVal}>{user?.designation || 'Specialist'}</Text>
        </View>
      </Card>

      {/* Security & Biometrics */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Security & Access</Text>
      </View>

      <Card style={styles.securityCard}>
        {isBiometricAvailable ? (
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Fingerprint color={colors.primaryLight} size={22} />
              <View style={styles.switchTextGroup}>
                <Text style={styles.switchTitle}>Biometric App Lock</Text>
                <Text style={styles.switchSub}>Use FaceID / Fingerprint to login</Text>
              </View>
            </View>
            <Switch
              value={isBiometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: colors.dark.surfaceSubtle, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        ) : null}

        <View style={styles.securityItem}>
          <Key color={colors.dark.textMuted} size={20} />
          <Text style={styles.securityItemText}>Hardware-Backed Keystore (Active)</Text>
          <Badge label="AES-256" variant="success" />
        </View>
      </Card>

      {/* Logout Action */}
      <Button
        title="Sign Out"
        variant="danger"
        onPress={handleLogout}
        icon={<LogOut color="#FFFFFF" size={18} />}
        style={styles.logoutBtn}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  userName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  userEmail: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    marginTop: spacing.sm,
  },
  detailsCard: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.dark.border,
    marginVertical: 6,
  },
  infoKey: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.textMuted,
    marginLeft: spacing.sm,
    flex: 1,
  },
  infoVal: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.text,
    fontWeight: typography.fontWeight.medium,
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
  securityCard: {
    marginBottom: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchTextGroup: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  switchTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark.text,
  },
  switchSub: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  securityItemText: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    flex: 1,
    marginLeft: spacing.sm,
  },
  logoutBtn: {
    marginTop: spacing.xs,
  },
});
