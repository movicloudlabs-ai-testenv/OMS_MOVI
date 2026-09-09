import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, borderRadius, typography } from '../../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const getContainerStyle = () => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
    };

    // Size
    if (size === 'sm') {
      base.paddingVertical = 8;
      base.paddingHorizontal = 12;
    } else if (size === 'lg') {
      base.paddingVertical = 16;
      base.paddingHorizontal = 24;
    } else {
      base.paddingVertical = 12;
      base.paddingHorizontal = 18;
    }

    // Variant
    if (variant === 'primary') {
      base.backgroundColor = colors.primary;
    } else if (variant === 'secondary') {
      base.backgroundColor = colors.dark.surfaceSubtle;
    } else if (variant === 'danger') {
      base.backgroundColor = colors.danger;
    } else if (variant === 'outline') {
      base.backgroundColor = 'transparent';
      base.borderWidth = 1.5;
      base.borderColor = colors.primary;
    } else if (variant === 'ghost') {
      base.backgroundColor = 'transparent';
    }

    if (disabled || loading) {
      base.opacity = 0.6;
    }

    return base;
  };

  const getTextStyle = () => {
    const base: TextStyle = {
      fontWeight: typography.fontWeight.semibold,
      fontSize: size === 'sm' ? typography.fontSize.sm : typography.fontSize.md,
      color: '#FFFFFF',
    };

    if (variant === 'outline' || variant === 'ghost') {
      base.color = colors.primaryLight;
    } else if (variant === 'secondary') {
      base.color = colors.dark.text;
    }

    return base;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#FFFFFF'} size="small" />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text style={[getTextStyle(), icon ? { marginLeft: 8 } : undefined, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};
