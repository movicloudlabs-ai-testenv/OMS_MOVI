import 'dart:io';
import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';

class ChatApi {
  final ApiClient _client = ApiClient();

  /// Fetch workspace channel list with live counts
  Future<List<Map<String, dynamic>>> getChannels() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.chatChannels);
      final raw = res.data['data'] ?? res.data;
      if (raw is List) {
        return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Fetch member roster and smart aliases for @mentions autocomplete
  Future<Map<String, dynamic>> getChannelMembers(String channelId) async {
    try {
      final res = await _client.dio.get(ApiEndpoints.chatChannelMembers(channelId));
      final raw = res.data['data'] ?? res.data;
      if (raw is Map) {
        return Map<String, dynamic>.from(raw);
      }
      return {'members': [], 'aliases': []};
    } catch (_) {
      return {'members': [], 'aliases': []};
    }
  }

  /// Fetch messages for a specific channel or direct user thread
  Future<List<Map<String, dynamic>>> getMessages({String? channel, String? recipientId}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (recipientId != null) {
        queryParams['recipientId'] = recipientId;
      } else {
        queryParams['channel'] = channel ?? '#general';
      }

      final res = await _client.dio.get(
        ApiEndpoints.chatMessages,
        queryParameters: queryParams,
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is List) {
        return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Send a message to a channel or direct colleague
  Future<Map<String, dynamic>?> sendMessage({
    String? channel,
    String? recipientId,
    required String message,
    String messageType = 'text',
    Map<String, dynamic>? taskRef,
    String? replyToId,
    List<Map<String, dynamic>>? attachments,
  }) async {
    try {
      final payload = <String, dynamic>{
        'message': message,
        'messageType': messageType,
      };
      if (recipientId != null) {
        payload['recipientId'] = recipientId;
      } else {
        payload['channel'] = channel ?? '#general';
      }
      if (taskRef != null) payload['taskRef'] = taskRef;
      if (replyToId != null) payload['replyTo'] = replyToId;
      if (attachments != null && attachments.isNotEmpty) {
        payload['attachments'] = attachments;
      }

      final res = await _client.dio.post(
        ApiEndpoints.chatMessages,
        data: payload,
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is Map) {
        return Map<String, dynamic>.from(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Turn a chat message into a tracked PMO Project Task (Conversational Ticketing)
  Future<Map<String, dynamic>?> createTaskFromMessage({
    required String messageId,
    required String projectId,
    required String title,
    String priority = 'Medium',
    String? dueDate,
  }) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.chatCreateTaskFromMessage,
        data: {
          'messageId': messageId,
          'projectId': projectId,
          'title': title,
          'priority': priority,
          if (dueDate != null) 'dueDate': dueDate,
        },
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is Map) {
        return Map<String, dynamic>.from(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Fetch active workspace colleagues for direct 1:1 internal chatting
  Future<List<Map<String, dynamic>>> getDirectChatUsers() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.chatUsers);
      final raw = res.data['data'] ?? res.data;
      if (raw is List) {
        return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Mark a channel as read by the user up to this moment
  Future<void> markChannelRead(String channelId) async {
    try {
      await _client.dio.post(ApiEndpoints.chatChannelRead(channelId));
    } catch (_) {}
  }

  /// Broadcast a company announcement
  Future<Map<String, dynamic>?> createAnnouncement({
    required String title,
    required String message,
    String priority = 'Normal',
  }) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.chatAnnouncements,
        data: {
          'title': title,
          'message': message,
          'priority': priority,
        },
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is Map) {
        return Map<String, dynamic>.from(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Create a custom channel
  Future<Map<String, dynamic>?> createCustomChannel({
    required String name,
    required String topic,
    bool isPrivate = false,
  }) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.chatChannels,
        data: {
          'name': name,
          'topic': topic,
          'isPrivate': isPrivate,
        },
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is Map) {
        return Map<String, dynamic>.from(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Upload media/image attachment for chat
  Future<Map<String, dynamic>?> uploadAttachment(File file) async {
    try {
      final fileName = file.path.split(Platform.isWindows ? r'\' : '/').last;
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: fileName),
      });

      final res = await _client.dio.post(
        ApiEndpoints.chatUpload,
        data: formData,
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is Map) {
        return Map<String, dynamic>.from(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Get WhatsApp-style Message Info (read receipts & delivery analytics)
  Future<Map<String, dynamic>?> getMessageInfo(String messageId) async {
    try {
      final res = await _client.dio.get(ApiEndpoints.chatMessageInfo(messageId));
      final raw = res.data['data'] ?? res.data;
      if (raw is Map) {
        return Map<String, dynamic>.from(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Upload and update custom channel or group profile icon
  Future<Map<String, dynamic>?> updateChannelAvatar(String channelId, File file) async {
    try {
      final fileName = file.path.split(Platform.isWindows ? r'\' : '/').last;
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: fileName),
      });

      final res = await _client.dio.post(
        ApiEndpoints.chatChannelAvatar(channelId),
        data: formData,
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is Map) {
        return Map<String, dynamic>.from(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
