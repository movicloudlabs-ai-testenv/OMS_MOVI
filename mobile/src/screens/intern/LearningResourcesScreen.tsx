import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { BookOpen, ExternalLink, CheckCircle2, Circle, Video, FileCode } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

interface ResourceItem {
  id: string;
  title: string;
  category: string;
  url: string;
  completed: boolean;
}

export const LearningResourcesScreen: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>([
    {
      id: 'r1',
      title: 'React Native New Architecture (Fabric & TurboModules)',
      category: 'Documentation',
      url: 'https://reactnative.dev/docs/the-new-architecture/landing-page',
      completed: true,
    },
    {
      id: 'r2',
      title: 'Building Enterprise Secure Storage with Expo SecureStore',
      category: 'Guide',
      url: 'https://docs.expo.dev/versions/latest/sdk/securestore/',
      completed: false,
    },
    {
      id: 'r3',
      title: 'MongoDB Aggregation Pipelines for Workspace Metrics',
      category: 'Video Tutorial',
      url: 'https://www.mongodb.com/docs/manual/aggregation/',
      completed: false,
    },
  ]);

  const toggleResource = (id: string) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open external resource.'));
  };

  return (
    <ScreenContainer>
      <Header title="Learning Hub" subtitle="Training Materials & Curriculum" />

      {resources.map((item) => (
        <Card key={item.id} style={styles.resourceCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <BookOpen color={colors.primaryLight} size={18} />
            </View>
            <Text style={styles.resourceTitle}>{item.title}</Text>
          </View>

          <View style={styles.metaRow}>
            <Badge label={item.category} variant="info" />
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => handleOpenLink(item.url)}
            >
              <Text style={styles.linkBtnText}>Open Material</Text>
              <ExternalLink color={colors.primaryLight} size={14} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.completeToggle}
              onPress={() => toggleResource(item.id)}
            >
              {item.completed ? (
                <CheckCircle2 color={colors.success} size={18} />
              ) : (
                <Circle color={colors.dark.textDim} size={18} />
              )}
              <Text
                style={[
                  styles.toggleText,
                  item.completed ? styles.completedToggleText : null,
                ]}
              >
                {item.completed ? 'Module Completed' : 'Mark as Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  resourceCard: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  resourceTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkBtnText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  completeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.textMuted,
    marginLeft: 6,
  },
  completedToggleText: {
    color: colors.success,
    fontWeight: typography.fontWeight.semibold,
  },
});
