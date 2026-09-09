import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../models/attendance_record.dart';
import '../../../../core/services/storage_service.dart';
import '../../data/employee_api.dart';

class AttendanceState {
  final AttendanceRecord? todayRecord;
  final List<AttendanceRecord> history;
  final double weeklyHoursLogged;
  final bool isLoading;
  final bool isPunching;
  final String selectedWorkMode;
  final Duration elapsedShift;
  final Duration elapsedBreak;
  final bool isOnBreak;
  final DateTime? breakStartTime;
  final String? errorMessage;

  const AttendanceState({
    this.todayRecord,
    this.history = const [],
    this.weeklyHoursLogged = 0.0,
    this.isLoading = false,
    this.isPunching = false,
    this.selectedWorkMode = 'Remote',
    this.elapsedShift = Duration.zero,
    this.elapsedBreak = Duration.zero,
    this.isOnBreak = false,
    this.breakStartTime,
    this.errorMessage,
  });

  bool get isPunchedIn => todayRecord?.checkIn != null && todayRecord?.checkOut == null;
  bool get isShiftCompleted => todayRecord?.checkOut != null;

  /// Returns finalized hours logged from previous days in the current week
  double get pastWeeklyHours {
    final now = DateTime.now();
    final monday = now.subtract(Duration(days: (now.weekday - 1))).copyWith(
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
      microsecond: 0,
    );

    double total = 0.0;
    final seenDates = <String>{};

    for (final rec in history) {
      if (rec.date.isEmpty) continue;
      final parsed = DateTime.tryParse(rec.date);
      if (parsed != null && !parsed.isBefore(monday)) {
        if (now.year == parsed.year && now.month == parsed.month && now.day == parsed.day) {
          continue;
        }
        final dateKey = '${parsed.year}-${parsed.month}-${parsed.day}';
        if (!seenDates.contains(dateKey)) {
          seenDates.add(dateKey);
          total += (rec.netHoursWorked ?? rec.hoursWorked);
        }
      }
    }
    return (total * 10).round() / 10;
  }

  AttendanceState copyWith({
    AttendanceRecord? todayRecord,
    bool clearTodayRecord = false,
    List<AttendanceRecord>? history,
    double? weeklyHoursLogged,
    bool? isLoading,
    bool? isPunching,
    String? selectedWorkMode,
    Duration? elapsedShift,
    Duration? elapsedBreak,
    bool? isOnBreak,
    DateTime? breakStartTime,
    bool clearBreakStartTime = false,
    String? errorMessage,
    bool clearErrorMessage = false,
  }) {
    return AttendanceState(
      todayRecord: clearTodayRecord ? null : (todayRecord ?? this.todayRecord),
      history: history ?? this.history,
      weeklyHoursLogged: weeklyHoursLogged ?? this.weeklyHoursLogged,
      isLoading: isLoading ?? this.isLoading,
      isPunching: isPunching ?? this.isPunching,
      selectedWorkMode: selectedWorkMode ?? this.selectedWorkMode,
      elapsedShift: elapsedShift ?? this.elapsedShift,
      elapsedBreak: elapsedBreak ?? this.elapsedBreak,
      isOnBreak: isOnBreak ?? this.isOnBreak,
      breakStartTime: clearBreakStartTime ? null : (breakStartTime ?? this.breakStartTime),
      errorMessage: clearErrorMessage ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class AttendanceNotifier extends StateNotifier<AttendanceState> {
  final EmployeeApi _api = EmployeeApi();
  Timer? _liveTicker;

  AttendanceNotifier() : super(const AttendanceState()) {
    loadAttendance();
  }

  @override
  void dispose() {
    _liveTicker?.cancel();
    super.dispose();
  }

  void setWorkMode(String mode) {
    state = state.copyWith(selectedWorkMode: mode);
  }

  bool _isRecordFromToday(AttendanceRecord? record) {
    if (record == null) return false;
    final now = DateTime.now();
    if (record.date.isNotEmpty) {
      final parsed = DateTime.tryParse(record.date);
      if (parsed != null) {
        final local = parsed.toLocal();
        if (local.year == now.year && local.month == now.month && local.day == now.day) {
          return true;
        }
        if (parsed.year == now.year && parsed.month == now.month && parsed.day == now.day) {
          return true;
        }
      }
    }
    if (record.checkInTime != null) {
      final inLocal = record.checkInTime!.toLocal();
      if (inLocal.year == now.year && inLocal.month == now.month && inLocal.day == now.day) {
        return true;
      }
    }
    return false;
  }

  Future<void> loadAttendance() async {
    state = state.copyWith(isLoading: true, clearErrorMessage: true);
    try {
      final rawToday = await _api.getTodayAttendance();
      final AttendanceRecord? today = _isRecordFromToday(rawToday) ? rawToday : null;
      final history = await _api.getMyAttendanceHistory();

      if (today == null) {
        await StorageService.delete(StorageKeys.shiftStartTime);
        await StorageService.delete(StorageKeys.breakStartTime);
        await StorageService.delete(StorageKeys.totalBreakSeconds);
      }

      bool onBreak = false;
      DateTime? breakStart;
      if (today != null && today.hasActiveBreak) {
        onBreak = true;
        final last = today.breaks.isNotEmpty ? today.breaks.last : null;
        if (last != null && last['start'] != null) {
          breakStart = DateTime.tryParse(last['start'].toString());
        }
      }

      final weekly = _computeWeeklyHours(history, today);

      state = state.copyWith(
        todayRecord: today,
        clearTodayRecord: today == null,
        history: history,
        weeklyHoursLogged: weekly,
        selectedWorkMode: today?.workMode ?? state.selectedWorkMode,
        isOnBreak: onBreak,
        breakStartTime: breakStart,
        clearBreakStartTime: breakStart == null,
        isLoading: false,
      );

      _recalculateDurations();
      _ensureTickerRunning();
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  void _ensureTickerRunning() {
    _liveTicker?.cancel();
    if (state.isPunchedIn) {
      _liveTicker = Timer.periodic(const Duration(seconds: 1), (_) {
        _recalculateDurations();
      });
    }
  }

  void _recalculateDurations() {
    final record = state.todayRecord;
    if (record == null) {
      if (state.elapsedShift != Duration.zero) {
        state = state.copyWith(elapsedShift: Duration.zero, elapsedBreak: Duration.zero);
      }
      return;
    }

    if (record.checkIn != null && record.checkOut == null) {
      final start = record.effectiveCheckInTime;
      if (start != null) {
        final now = DateTime.now();
        final gross = now.difference(start);

        // Break seconds
        int totalBreakSecs = (record.totalBreakMinutes * 60).round();
        Duration breakElapsed = Duration.zero;
        if (state.isOnBreak && state.breakStartTime != null) {
          final liveBreak = now.difference(state.breakStartTime!).inSeconds.abs();
          totalBreakSecs += liveBreak;
          breakElapsed = Duration(seconds: liveBreak);
        }

        final netSecs = (gross.inSeconds - totalBreakSecs).clamp(0, 86400 * 7);
        final liveWeekly = _computeWeeklyHours(state.history, record, netShiftSecs: netSecs);
        state = state.copyWith(
          elapsedShift: Duration(seconds: netSecs),
          elapsedBreak: breakElapsed,
          weeklyHoursLogged: liveWeekly,
        );
      }
    } else if (record.checkOut != null) {
      int shiftSecs = 0;
      final start = record.effectiveCheckInTime;
      final end = record.effectiveCheckOutTime;
      if (start != null && end != null && end.isAfter(start)) {
        final gross = end.difference(start).inSeconds;
        final breakSecs = (record.totalBreakMinutes * 60).round();
        shiftSecs = (gross - breakSecs).clamp(0, 86400 * 7);
      } else {
        final hours = record.netHoursWorked ?? record.hoursWorked;
        shiftSecs = (hours * 3600).round();
      }
      final weekly = _computeWeeklyHours(state.history, record);
      state = state.copyWith(
        elapsedShift: Duration(seconds: shiftSecs),
        elapsedBreak: Duration.zero,
        weeklyHoursLogged: weekly,
      );
    }
  }

  double _computeWeeklyHours(List<AttendanceRecord> history, AttendanceRecord? todayRecord, {int? netShiftSecs}) {
    final now = DateTime.now();
    // Week starts Monday
    final monday = now.subtract(Duration(days: (now.weekday - 1))).copyWith(
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
      microsecond: 0,
    );

    double total = 0.0;
    final seenDates = <String>{};

    for (final rec in history) {
      if (rec.date.isEmpty) continue;
      final parsed = DateTime.tryParse(rec.date);
      if (parsed != null && !parsed.isBefore(monday)) {
        final dateKey = '${parsed.year}-${parsed.month}-${parsed.day}';
        // Avoid double-counting today if today is also in history
        if (now.year == parsed.year && now.month == parsed.month && now.day == parsed.day) {
          continue;
        }
        if (!seenDates.contains(dateKey)) {
          seenDates.add(dateKey);
          total += (rec.netHoursWorked ?? rec.hoursWorked);
        }
      }
    }

    // Add today's hours if checked out or running
    if (todayRecord != null) {
      if (todayRecord.checkOut != null) {
        total += (todayRecord.netHoursWorked ?? todayRecord.hoursWorked);
      } else if (netShiftSecs != null) {
        total += (netShiftSecs / 3600.0);
      } else if (todayRecord.effectiveCheckInTime != null) {
        final diff = DateTime.now().difference(todayRecord.effectiveCheckInTime!);
        final grossHours = diff.inSeconds / 3600.0;
        final netHours = (grossHours - (todayRecord.totalBreakMinutes / 60.0)).clamp(0.0, 24.0);
        total += netHours;
      }
    }

    return (total * 10).round() / 10;
  }

  Future<bool> clockIn({String? workMode}) async {
    state = state.copyWith(isPunching: true, clearErrorMessage: true);
    final mode = workMode ?? state.selectedWorkMode;
    try {
      final record = await _api.checkIn(workMode: mode);
      final now = DateTime.now();
      await StorageService.set(
        StorageKeys.shiftStartTime,
        (record.effectiveCheckInTime ?? now).toIso8601String(),
      );
      await StorageService.delete(StorageKeys.breakStartTime);
      await StorageService.delete(StorageKeys.totalBreakSeconds);

      state = state.copyWith(
        todayRecord: record,
        selectedWorkMode: record.workMode,
        isPunching: false,
        isOnBreak: false,
        clearBreakStartTime: true,
      );

      _recalculateDurations();
      _ensureTickerRunning();
      // Reload history in background for refreshed stats
      _api.getMyAttendanceHistory().then((h) {
        if (mounted) {
          final w = _computeWeeklyHours(h, record);
          state = state.copyWith(history: h, weeklyHoursLogged: w);
        }
      }).catchError((_) {});

      return true;
    } catch (e) {
      String msg = 'Failed to record clock-in. Please try again.';
      if (e is DioException) {
        final serverMsg = e.response?.data?['message']?.toString();
        if (serverMsg != null && serverMsg.isNotEmpty) {
          msg = serverMsg;
        }
      }
      state = state.copyWith(
        isPunching: false,
        errorMessage: msg,
      );
      return false;
    }
  }

  Future<bool> clockOut() async {
    state = state.copyWith(isPunching: true, clearErrorMessage: true);
    try {
      final record = await _api.checkOut();
      await StorageService.delete(StorageKeys.shiftStartTime);
      await StorageService.delete(StorageKeys.breakStartTime);
      await StorageService.delete(StorageKeys.totalBreakSeconds);

      _liveTicker?.cancel();

      final updatedHistory = await _api.getMyAttendanceHistory().catchError((_) => state.history);
      final weekly = _computeWeeklyHours(updatedHistory, record);

      state = state.copyWith(
        todayRecord: record,
        history: updatedHistory,
        weeklyHoursLogged: weekly,
        isPunching: false,
        isOnBreak: false,
        clearBreakStartTime: true,
      );

      _recalculateDurations();
      return true;
    } catch (e) {
      String msg = 'Failed to record clock-out. Please try again.';
      if (e is DioException) {
        final serverMsg = e.response?.data?['message']?.toString();
        if (serverMsg != null && serverMsg.isNotEmpty) {
          msg = serverMsg;
        }
      }
      state = state.copyWith(
        isPunching: false,
        errorMessage: msg,
      );
      return false;
    }
  }

  Future<bool> toggleBreak() async {
    state = state.copyWith(isPunching: true, clearErrorMessage: true);
    try {
      if (state.isOnBreak) {
        // End break
        final record = await _api.endBreak();
        await StorageService.delete(StorageKeys.breakStartTime);

        state = state.copyWith(
          todayRecord: record ?? state.todayRecord,
          isPunching: false,
          isOnBreak: false,
          clearBreakStartTime: true,
          elapsedBreak: Duration.zero,
        );
      } else {
        // Start break
        final record = await _api.startBreak();
        final now = DateTime.now();
        await StorageService.set(StorageKeys.breakStartTime, now.toIso8601String());

        state = state.copyWith(
          todayRecord: record ?? state.todayRecord,
          isPunching: false,
          isOnBreak: true,
          breakStartTime: now,
        );
      }
      _recalculateDurations();
      return true;
    } catch (e) {
      String msg = 'Failed to update break status.';
      if (e is DioException) {
        final serverMsg = e.response?.data?['message']?.toString();
        if (serverMsg != null && serverMsg.isNotEmpty) {
          msg = serverMsg;
        }
      }
      state = state.copyWith(
        isPunching: false,
        errorMessage: msg,
      );
      return false;
    }
  }

  Future<bool> resetToday() async {
    state = state.copyWith(isLoading: true, clearErrorMessage: true);
    try {
      _liveTicker?.cancel();
      await _api.resetTodayAttendance();
      await StorageService.delete(StorageKeys.shiftStartTime);
      await StorageService.delete(StorageKeys.breakStartTime);
      await StorageService.delete(StorageKeys.totalBreakSeconds);

      final history = await _api.getMyAttendanceHistory().catchError((_) => state.history);
      final weekly = _computeWeeklyHours(history, null);

      state = state.copyWith(
        clearTodayRecord: true,
        history: history,
        weeklyHoursLogged: weekly,
        elapsedShift: Duration.zero,
        elapsedBreak: Duration.zero,
        isOnBreak: false,
        clearBreakStartTime: true,
        isLoading: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to reset today shift');
      return false;
    }
  }
}

final attendanceProvider = StateNotifierProvider<AttendanceNotifier, AttendanceState>((ref) {
  return AttendanceNotifier();
});
