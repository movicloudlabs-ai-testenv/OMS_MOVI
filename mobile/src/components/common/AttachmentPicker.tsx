import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { colors, borderRadius, typography, spacing } from '../../styles/theme';

interface AttachmentPickerProps {
  imageUri: string | null;
  onImageSelected: (uri: string | null) => void;
  label?: string;
}

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  imageUri,
  onImageSelected,
  label = 'Attach Document / Photo Proof',
}) => {
  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow gallery access in device settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Gallery pick error:', e);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow camera access in device settings.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Camera capture error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => onImageSelected(null)}
          >
            <X color="#FFFFFF" size={16} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={takePhoto}
            activeOpacity={0.7}
          >
            <Camera color={colors.primaryLight} size={20} />
            <Text style={styles.pickerBtnText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={pickFromGallery}
            activeOpacity={0.7}
          >
            <ImageIcon color={colors.primaryLight} size={20} />
            <Text style={styles.pickerBtnText}>Upload File</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.dark.textMuted,
    marginBottom: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    marginHorizontal: 3,
  },
  pickerBtnText: {
    fontSize: typography.fontSize.xs,
    color: colors.dark.text,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: 6,
  },
  previewContainer: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    height: 140,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
