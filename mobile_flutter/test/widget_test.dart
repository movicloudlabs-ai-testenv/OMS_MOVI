import 'package:flutter_test/flutter_test.dart';
import 'package:movi_owms/core/services/location_service.dart';
import 'package:movi_owms/models/user_profile.dart';
import 'package:movi_owms/models/attendance_record.dart';
import 'package:movi_owms/models/task_item.dart';
import 'package:movi_owms/models/leave_item.dart';
import 'package:movi_owms/config/env.dart';

void main() {
  group('Enterprise Model & Unit Tests', () {
    test('Haversine distance calculation within geofence', () {
      // Point very close to office coords (12.9716, 77.5946)
      final distance = LocationService.calculateDistanceMeters(
        Env.officeLatitude,
        Env.officeLongitude,
        12.9718,
        77.5948,
      );

      expect(distance, lessThan(Env.officeRadiusMeters));
    });

    test('UserProfile JSON deserialization and role mapping', () {
      final json = {
        '_id': 'u123',
        'name': 'Sarah HR',
        'email': 'sarah.hr@owms.com',
        'role': {'_id': 'r1', 'name': 'HR Manager', 'slug': 'hr-manager'},
        'department': {'name': 'Human Resources'},
        'designation': 'Senior HR Lead',
        'isActive': true,
      };

      final profile = UserProfile.fromJson(json);
      expect(profile.id, 'u123');
      expect(profile.name, 'Sarah HR');
      expect(profile.role.slug, 'hr-manager');
      expect(profile.department, 'Human Resources');
      expect(profile.isActive, isTrue);
    });

    test('AttendanceRecord JSON deserialization', () {
      final json = {
        '_id': 'att-1',
        'date': '2026-09-06',
        'checkIn': '2026-09-06T09:00:00.000Z',
        'status': 'present',
        'workMode': 'office',
        'isGeofenced': true,
      };

      final record = AttendanceRecord.fromJson(json);
      expect(record.status, 'present');
      expect(record.isGeofenced, isTrue);
      expect(record.workMode, 'office');
    });

    test('TaskItem and SubTask checklist parsing', () {
      final json = {
        '_id': 'task-101',
        'title': 'Deploy OWMS Flutter Mobile App',
        'status': 'in-progress',
        'priority': 'urgent',
        'project': {'name': 'Mobile Launch', 'key': 'MVI-1'},
        'subtasks': [
          {'title': 'Write Flutter Riverpod Shell', 'completed': true},
          {'title': 'Configure Android Manifest GPS permissions', 'completed': true},
        ],
      };

      final task = TaskItem.fromJson(json);
      expect(task.title, 'Deploy OWMS Flutter Mobile App');
      expect(task.priority, 'urgent');
      expect(task.projectKey, 'MVI-1');
      expect(task.subtasks.length, 2);
      expect(task.subtasks.every((s) => s.completed), isTrue);
    });

    test('LeaveBalance calculation and quota categories', () {
      final json = {
        'casualLeave': {'total': 12, 'used': 4, 'remaining': 8},
        'sickLeave': {'total': 8, 'used': 2, 'remaining': 6},
        'earnedLeave': {'total': 15, 'used': 3, 'remaining': 12},
      };

      final balance = LeaveBalance.fromJson(json);
      expect(balance.casualLeave.remaining, 8);
      expect(balance.sickLeave.remaining, 6);
      expect(balance.earnedLeave.remaining, 12);
    });

    test('AttendanceRecord effectiveCheckInTime parses ISO and 12-hour AM/PM formats', () {
      final isoRecord = AttendanceRecord(
        date: '2026-09-08',
        status: 'present',
        checkIn: '2026-09-08T09:30:00.000Z',
      );
      expect(isoRecord.effectiveCheckInTime, isNotNull);
      expect(isoRecord.effectiveCheckInTime!.hour, isNotNull);

      final ampmRecord = AttendanceRecord(
        date: '2026-09-08',
        status: 'present',
        checkIn: '09:30 AM',
      );
      expect(ampmRecord.effectiveCheckInTime, isNotNull);
      expect(ampmRecord.effectiveCheckInTime!.hour, 9);
      expect(ampmRecord.effectiveCheckInTime!.minute, 30);

      final pmRecord = AttendanceRecord(
        date: '2026-09-08',
        status: 'present',
        checkIn: '02:45 PM',
      );
      expect(pmRecord.effectiveCheckInTime, isNotNull);
      expect(pmRecord.effectiveCheckInTime!.hour, 14);
      expect(pmRecord.effectiveCheckInTime!.minute, 45);
    });

    test('TaskItem priorityPoints and isCompleted for EOD checklist', () {
      final urgentTask = TaskItem(
        id: 't-1',
        title: 'Fix critical bug',
        status: 'In Progress',
        priority: 'urgent',
      );
      expect(urgentTask.priorityPoints, 50);
      expect(urgentTask.isCompleted, isFalse);

      final highTask = TaskItem(
        id: 't-2',
        title: 'Implement feature',
        status: 'Completed',
        priority: 'high',
      );
      expect(highTask.priorityPoints, 35);
      expect(highTask.isCompleted, isTrue);

      final mediumTask = TaskItem(
        id: 't-3',
        title: 'Write docs',
        status: 'Done',
        priority: 'medium',
      );
      expect(mediumTask.priorityPoints, 20);
      expect(mediumTask.isCompleted, isTrue);

      final lowTask = TaskItem(
        id: 't-4',
        title: 'Refactor code',
        status: 'Todo',
        priority: 'low',
      );
      expect(lowTask.priorityPoints, 10);
      expect(lowTask.isCompleted, isFalse);
    });
  });
}
