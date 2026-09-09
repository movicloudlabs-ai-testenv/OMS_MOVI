import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building,
  RefreshCw,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LocationService, GeoLocationResult } from '../../services/location';
import { EmployeeApi, AttendanceRecord } from '../../api/employee.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';
import { ENV } from '../../config/env';

export const AttendanceScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [geoResult, setGeoResult] = useState<GeoLocationResult | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      const res = await EmployeeApi.getTodayAttendance();
      if (res.success) {
        setTodayRecord(res.data);
      }
    } catch (e) {
      console.warn('Failed to fetch attendance status:', e);
    } finally {
      setLoading(false);
    }
  };

  const acquireGPS = async () => {
    try {
      setLocating(true);
      setLocationError(null);
      const result = await LocationService.getCurrentLocation();
      setGeoResult(result);

      if (result.isMocked) {
        Alert.alert(
          'Security Alert',
          'Mock/Simulated GPS location detected. Attendance cannot be verified using spoofed coordinates.'
        );
      }
    } catch (err: any) {
      setLocationError(err.message || 'Could not acquire GPS position');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
    acquireGPS();
  }, []);

  const handlePunchIn = async () => {
    if (!geoResult) {
      Alert.alert('GPS Required', 'Please wait for your GPS coordinates to be acquired.');
      return;
    }

    if (geoResult.isMocked) {
      Alert.alert('Verification Failed', 'Mock GPS is not allowed for punch-in.');
      return;
    }

    try {
      setLoading(true);
      const res = await EmployeeApi.checkIn({
        latitude: geoResult.latitude,
        longitude: geoResult.longitude,
        accuracy: geoResult.accuracy,
        isGeofenced: geoResult.isWithinGeofence,
        workMode: geoResult.isWithinGeofence ? 'office' : 'remote',
      });
      if (res.success) {
        setTodayRecord(res.data);
        Alert.alert('Success', 'Punch In recorded successfully!');
      }
    } catch (err: any) {
      Alert.alert('Punch In Failed', err.response?.data?.message || 'Could not record check-in.');
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    try {
      setLoading(true);
      const res = await EmployeeApi.checkOut();
      if (res.success) {
        setTodayRecord(res.data);
        Alert.alert('Success', 'Punch Out recorded successfully!');
      }
    } catch (err: any) {
      Alert.alert('Punch Out Failed', err.response?.data?.message || 'Could not record check-out.');
    } finally {
      setLoading(false);
    }
  };

  const isCheckedIn = Boolean(todayRecord?.checkIn);
  const isCheckedOut = Boolean(todayRecord?.checkOut);

  return (
    <ScreenContainer refreshing={loading} onRefresh={fetchTodayStatus}>
      <Header title="Attendance" subtitle="Geofenced Workplace Punch-In" />

      {/* Today's Status Card */}
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Clock color={colors.primaryLight} size={22} />
          <Text style={styles.statusDate}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <Badge
            label={
              isCheckedOut
                ? 'Checked Out'
                : isCheckedIn
                ? 'Checked In'
                : 'Not Checked In'
            }
            variant={isCheckedIn && !isCheckedOut ? 'success' : isCheckedOut ? 'neutral' : 'warning'}
          />
        </View>

        <View style={styles.timeGrid}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>PUNCH IN</Text>
            <Text style={styles.timeValue}>
              {todayRecord?.checkIn
                ? new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>PUNCH OUT</Text>
            <Text style={styles.timeValue}>
              {todayRecord?.checkOut
                ? new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Geofence & GPS Card */}
      <Card style={styles.geofenceCard}>
        <View style={styles.geoHeader}>
          <Building color={colors.primaryLight} size={20} />
          <Text style={styles.geoTitle}>Office Geofence Status</Text>
          <TouchableOpacity onPress={acquireGPS} disabled={locating}>
            <RefreshCw color={colors.dark.textMuted} size={18} />
          </TouchableOpacity>
        </View>

        {locating ? (
          <View style={styles.locatingRow}>
            <ActivityIndicator color={colors.primaryLight} size="small" />
            <Text style={styles.locatingText}>Acquiring GPS coordinates...</Text>
          </View>
        ) : geoResult ? (
          <View style={styles.geoDetails}>
            <View style={styles.geoRow}>
              <Text style={styles.geoKey}>Distance to Office:</Text>
              <Text style={styles.geoVal}>{geoResult.distanceFromOfficeMeters} meters</Text>
            </View>
            <View style={styles.geoRow}>
              <Text style={styles.geoKey}>Office Geofence Limit:</Text>
              <Text style={styles.geoVal}>{ENV.OFFICE_COORDINATES.radiusMeters} meters</Text>
            </View>
            <View style={styles.geoRow}>
              <Text style={styles.geoKey}>Geofence Status:</Text>
              <Badge
                label={geoResult.isWithinGeofence ? 'Within Office Zone' : 'Remote / Outside'}
                variant={geoResult.isWithinGeofence ? 'success' : 'info'}
              />
            </View>
            {geoResult.isMocked ? (
              <View style={styles.warningBox}>
                <AlertTriangle color={colors.danger} size={16} />
                <Text style={styles.warningText}>Mock GPS provider detected</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={styles.errorText}>
            {locationError || 'GPS location not available. Please allow permissions.'}
          </Text>
        )}
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {!isCheckedIn ? (
          <Button
            title="Punch In Now"
            onPress={handlePunchIn}
            loading={loading}
            icon={<CheckCircle2 color="#FFFFFF" size={20} />}
            style={styles.punchInBtn}
          />
        ) : !isCheckedOut ? (
          <Button
            title="Punch Out"
            onPress={handlePunchOut}
            loading={loading}
            variant="danger"
            icon={<Clock color="#FFFFFF" size={20} />}
            style={styles.punchOutBtn}
          />
        ) : (
          <View style={styles.completedBox}>
            <ShieldCheck color={colors.success} size={28} />
            <Text style={styles.completedText}>Attendance complete for today.</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  statusCard: {
    marginBottom: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  statusDate: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark.text,
    flex: 1,
    marginLeft: 8,
  },
  timeGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  timeBox: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.dark.border,
  },
  timeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    fontWeight: typography.fontWeight.medium,
  },
  timeValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    marginTop: 4,
  },
  geofenceCard: {
    marginBottom: spacing.lg,
  },
  geoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  geoTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark.text,
    flex: 1,
    marginLeft: 8,
  },
  locatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  locatingText: {
    color: colors.dark.textMuted,
    marginLeft: 8,
    fontSize: typography.fontSize.sm,
  },
  geoDetails: {
    marginTop: spacing.xs,
  },
  geoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  geoKey: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.textMuted,
  },
  geoVal: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.text,
    fontWeight: typography.fontWeight.medium,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  warningText: {
    color: colors.danger,
    fontSize: typography.fontSize.xs,
    marginLeft: 6,
    fontWeight: typography.fontWeight.semibold,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSize.xs,
    marginTop: 4,
  },
  actionContainer: {
    marginTop: spacing.xs,
  },
  punchInBtn: {
    backgroundColor: colors.success,
  },
  punchOutBtn: {
    backgroundColor: colors.danger,
  },
  completedBox: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  completedText: {
    color: colors.dark.text,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
  },
});
