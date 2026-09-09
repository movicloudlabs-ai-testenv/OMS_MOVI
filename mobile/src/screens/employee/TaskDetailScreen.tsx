import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  CheckSquare,
  Square,
  Clock,
  User,
  Folder,
  Send,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AttachmentPicker } from '../../components/common/AttachmentPicker';
import { TaskItem, EmployeeApi } from '../../api/employee.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const TaskDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const taskParam: TaskItem = route.params?.task || {
    _id: 'mock-1',
    title: 'Implement Mobile Task Details Screen',
    description: 'Build complete task detail view with subtask checklist, comments stream, and status changer.',
    status: 'in-progress',
    priority: 'high',
    project: { _id: 'p1', name: 'Movi Mobile Launch' },
    subtasks: [
      { _id: 's1', title: 'Design card UI and subtasks checklist', completed: true },
      { _id: 's2', title: 'Connect comment submission API', completed: false },
      { _id: 's3', title: 'Integrate native screenshot attachment', completed: false },
    ],
  };

  const [task, setTask] = useState<TaskItem>(taskParam);
  const [subtasks, setSubtasks] = useState(taskParam.subtasks || []);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<
    { id: string; author: string; text: string; time: string }[]
  >([
    {
      id: 'c1',
      author: 'PMO Lead',
      text: 'Please make sure subtask checkboxes update reactively on touch.',
      time: '10:30 AM',
    },
  ]);
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleSubtask = (subId: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s._id === subId ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleAddComment = () => {
    if (!commentText.trim() && !attachmentUri) return;

    setComments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        author: 'Me',
        text: commentText.trim(),
        time: 'Just now',
      },
    ]);
    setCommentText('');
    setAttachmentUri(null);
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      await EmployeeApi.updateTaskStatus(task._id, newStatus);
      setTask((prev) => ({ ...prev, status: newStatus as any }));
      Alert.alert('Status Updated', `Task moved to ${newStatus}`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;

  return (
    <ScreenContainer>
      {/* Top Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.dark.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          Task Details
        </Text>
        <Badge
          label={task.priority}
          variant={
            task.priority === 'urgent' || task.priority === 'high' ? 'danger' : 'neutral'
          }
        />
      </View>

      {/* Main Task Card */}
      <Card style={styles.mainCard}>
        <Text style={styles.taskTitle}>{task.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Folder color={colors.dark.textMuted} size={14} />
            <Text style={styles.metaText}>{task.project?.name || 'General Project'}</Text>
          </View>
          <Badge
            label={task.status.replace('-', ' ')}
            variant={
              task.status === 'done'
                ? 'success'
                : task.status === 'in-progress'
                ? 'primary'
                : 'warning'
            }
          />
        </View>

        {task.description ? (
          <Text style={styles.description}>{task.description}</Text>
        ) : null}

        {/* Status Switcher Buttons */}
        <View style={styles.statusRow}>
          {(['todo', 'in-progress', 'in-review', 'done'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              style={[
                styles.statusChip,
                task.status === st ? styles.activeStatusChip : null,
              ]}
              onPress={() => handleStatusChange(st)}
              disabled={isUpdating}
            >
              <Text
                style={[
                  styles.statusChipText,
                  task.status === st ? styles.activeStatusChipText : null,
                ]}
              >
                {st.replace('-', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Subtasks Checklist */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Subtasks ({completedSubtasksCount}/{subtasks.length})
        </Text>
      </View>

      <Card style={styles.subtasksCard}>
        {subtasks.length === 0 ? (
          <Text style={styles.emptySubtasks}>No subtasks for this item.</Text>
        ) : (
          subtasks.map((st) => (
            <TouchableOpacity
              key={st._id}
              style={styles.subtaskRow}
              activeOpacity={0.7}
              onPress={() => toggleSubtask(st._id)}
            >
              {st.completed ? (
                <CheckSquare color={colors.success} size={20} />
              ) : (
                <Square color={colors.dark.textDim} size={20} />
              )}
              <Text
                style={[
                  styles.subtaskTitle,
                  st.completed ? styles.completedSubtaskTitle : null,
                ]}
              >
                {st.title}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </Card>

      {/* Comments & Activity Stream */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Comments & Notes</Text>
      </View>

      {comments.map((c) => (
        <Card key={c.id} style={styles.commentCard}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{c.author}</Text>
            <Text style={styles.commentTime}>{c.time}</Text>
          </View>
          <Text style={styles.commentText}>{c.text}</Text>
        </Card>
      ))}

      {/* Add Comment Input */}
      <Card style={styles.addCommentCard}>
        <Input
          placeholder="Type a comment or status update..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
          numberOfLines={2}
          style={styles.commentInput}
        />

        <AttachmentPicker
          imageUri={attachmentUri}
          onImageSelected={setAttachmentUri}
          label="Add Screenshot / Attachment"
        />

        <Button
          title="Post Comment"
          size="sm"
          onPress={handleAddComment}
          icon={<Send color="#FFFFFF" size={16} />}
          style={styles.postBtn}
        />
      </Card>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    flex: 1,
    marginLeft: spacing.sm,
  },
  mainCard: {
    marginBottom: spacing.md,
  },
  taskTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginLeft: 4,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    paddingTop: spacing.sm,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.surfaceSubtle,
  },
  activeStatusChip: {
    backgroundColor: colors.primary,
  },
  statusChipText: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    textTransform: 'capitalize',
  },
  activeStatusChipText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.bold,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  subtasksCard: {
    marginBottom: spacing.md,
  },
  emptySubtasks: {
    color: colors.dark.textDim,
    fontSize: typography.fontSize.xs,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  subtaskTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.text,
    marginLeft: 10,
    flex: 1,
  },
  completedSubtaskTitle: {
    textDecorationLine: 'line-through',
    color: colors.dark.textDim,
  },
  commentCard: {
    marginBottom: spacing.xs,
    backgroundColor: colors.dark.surfaceSubtle,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  commentTime: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textDim,
  },
  commentText: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.text,
    lineHeight: 18,
  },
  addCommentCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  commentInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  postBtn: {
    marginTop: spacing.xs,
  },
});
