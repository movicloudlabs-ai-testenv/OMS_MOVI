import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { CheckSquare, Filter, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { EmployeeApi, TaskItem } from '../../api/employee.api';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export const TaskBoardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'todo' | 'in-progress' | 'in-review' | 'done'>('all');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await EmployeeApi.getMyTasks();
      if (res.success) {
        setTasks(res.data || []);
      }
    } catch (e) {
      console.warn('Failed to load tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTask) return;
    try {
      setStatusUpdating(true);
      const res = await EmployeeApi.updateTaskStatus(selectedTask._id, newStatus);
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t._id === selectedTask._id ? { ...t, status: newStatus as any } : t))
        );
        setSelectedTask(null);
        Alert.alert('Status Updated', `Task moved to ${newStatus}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update task status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = t.title.toLowerCase().includes(query);
    const descMatch = t.description ? t.description.toLowerCase().includes(query) : false;
    const matchesSearch = !searchQuery || titleMatch || descMatch;

    if (selectedFilter === 'all') return matchesSearch;
    return matchesSearch && t.status === selectedFilter;
  });

  return (
    <ScreenContainer refreshing={loading} onRefresh={fetchTasks}>
      <Header title="My Tasks" subtitle="Touch-Optimized Task Board" />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search tasks by title or description..."
      />

      {/* Filter Tabs */}
      <View style={styles.filterScroll}>
        {(['all', 'todo', 'in-progress', 'in-review', 'done'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              selectedFilter === filter ? styles.activeFilterChip : null,
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter ? styles.activeFilterText : null,
              ]}
            >
              {filter.replace('-', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <CheckSquare color={colors.dark.textDim} size={48} />
          <Text style={styles.emptyTitle}>No tasks found</Text>
          <Text style={styles.emptySub}>You have no tasks matching this filter.</Text>
        </View>
      ) : (
        filteredTasks.map((task) => (
          <TouchableOpacity
            key={task._id}
            activeOpacity={0.8}
            onPress={() => {
              if (navigation) {
                navigation.navigate('TaskDetail', { task });
              } else {
                setSelectedTask(task);
              }
            }}
          >
            <Card style={styles.taskCard}>
              <View style={styles.cardHeader}>
                <Badge
                  label={task.priority}
                  variant={
                    task.priority === 'urgent' || task.priority === 'high'
                      ? 'danger'
                      : 'neutral'
                  }
                />
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setSelectedTask(task);
                  }}
                >
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
                </TouchableOpacity>
              </View>

              <Text style={styles.taskTitle}>{task.title}</Text>
              {task.description ? (
                <Text style={styles.taskDesc} numberOfLines={2}>
                  {task.description}
                </Text>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={styles.projectText}>
                  {task.project?.name || 'General Project'}
                </Text>
                <View style={styles.actionPrompt}>
                  <Text style={styles.actionPromptText}>View Details</Text>
                  <ChevronRight color={colors.primaryLight} size={16} />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}

      {/* Status Update Modal */}
      {selectedTask ? (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Update Task Status</Text>
              <Text style={styles.modalTaskName}>{selectedTask.title}</Text>

              <View style={styles.statusOptions}>
                {[
                  { label: 'To Do', value: 'todo' },
                  { label: 'In Progress', value: 'in-progress' },
                  { label: 'Submit for Review', value: 'in-review' },
                  { label: 'Completed (Done)', value: 'done' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.statusSelectBtn,
                      selectedTask.status === item.value ? styles.activeStatusOption : null,
                    ]}
                    onPress={() => handleUpdateStatus(item.value)}
                    disabled={statusUpdating}
                  >
                    <Text style={styles.statusSelectText}>{item.label}</Text>
                    {selectedTask.status === item.value ? (
                      <CheckCircle color={colors.primaryLight} size={18} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setSelectedTask(null)}
                style={styles.cancelModalBtn}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  filterScroll: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  filterChip: {
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.dark.textMuted,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.semibold,
  },
  taskCard: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  taskTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    marginTop: 2,
  },
  taskDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.textMuted,
    marginTop: 4,
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
  projectText: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textDim,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPromptText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    marginRight: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    color: colors.dark.text,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.textMuted,
    marginTop: 4,
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
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
  },
  modalTaskName: {
    fontSize: typography.fontSize.sm,
    color: colors.dark.textMuted,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  statusOptions: {
    marginBottom: spacing.md,
  },
  statusSelectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.dark.bg,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  activeStatusOption: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  statusSelectText: {
    color: colors.dark.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  cancelModalBtn: {
    marginTop: spacing.xs,
  },
});
