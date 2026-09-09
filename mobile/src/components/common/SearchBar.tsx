import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { colors, borderRadius, typography, spacing } from '../../styles/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Search color={colors.dark.textDim} size={18} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.dark.textDim}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearBtn}>
          <X color={colors.dark.textMuted} size={16} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: spacing.sm,
    height: 44,
    marginBottom: spacing.md,
  },
  icon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: colors.dark.text,
    fontSize: typography.fontSize.sm,
  },
  clearBtn: {
    padding: 4,
  },
});
