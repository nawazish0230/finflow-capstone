import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface UploadItem {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  status: 'Done';
  uri?: string;
}

function formatUploadDate(): string {
  const d = new Date();
  return `Uploaded ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleTapUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const sizeBytes = file.size ?? 0;

      if (sizeBytes > MAX_SIZE_BYTES) {
        Alert.alert(
          'File too large',
          `Please select a PDF under ${MAX_SIZE_MB}MB. This file is ${formatFileSize(sizeBytes)}.`,
        );
        return;
      }

      setUploading(true);
      // Brief delay for "uploading" feedback (no API call)
      await new Promise((r) => setTimeout(r, 400));

      const newItem: UploadItem = {
        id: `upload-${Date.now()}`,
        name: file.name ?? 'Statement.pdf',
        size: formatFileSize(sizeBytes),
        uploadedAt: formatUploadDate(),
        status: 'Done',
        uri: file.uri,
      };
      setUploads((prev) => [newItem, ...prev]);
    } catch (err) {
      Alert.alert('Error', 'Could not open file picker. Please try again.');
    } finally {
      setUploading(false);
    }
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ThemedText type="subtitle">Upload Statement</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            Upload your bank PDF to analyze spending
          </ThemedText>
        </View>

        <Pressable
          onPress={handleTapUpload}
          disabled={uploading}
          style={({ pressed }) => [
            styles.dropZone,
            {
              borderColor: colors.border,
              backgroundColor: pressed ? colors.card : 'transparent',
              opacity: uploading ? 0.7 : 1,
            },
          ]}>
          <View style={[styles.uploadIconCircle, { backgroundColor: colors.primary + '20' }]}>
            <MaterialIcons
              name="upload-file"
              size={40}
              color={colors.primary}
            />
          </View>
          <ThemedText style={styles.dropZoneTitle}>
            {uploading ? 'Uploading…' : 'Tap to Upload PDF'}
          </ThemedText>
          <ThemedText style={[styles.dropZoneHint, { color: textSecondary }]}>
            Supports standard bank statements (PDF) up to {MAX_SIZE_MB}MB
          </ThemedText>
        </Pressable>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>RECENT UPLOADS</ThemedText>
          {uploads.length === 0 ? (
            <ThemedText style={[styles.emptyHint, { color: textSecondary }]}>
              No uploads yet. Tap the area above to add a statement.
            </ThemedText>
          ) : (
            uploads.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.duration(280).springify()}
                style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.listItemLeft}>
                  <View style={[styles.pdfIconWrap, { backgroundColor: colors.error + '18' }]}>
                    <MaterialIcons name="picture-as-pdf" size={24} color={colors.error} />
                  </View>
                  <View style={styles.listItemText}>
                    <ThemedText style={styles.fileName} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                    <ThemedText style={[styles.fileMeta, { color: textSecondary }]}>
                      {item.size} · {item.uploadedAt}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.badge, { backgroundColor: success + '22' }]}>
                  <ThemedText style={[styles.badgeText, { color: success }]}>{item.status}</ThemedText>
                </View>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: { marginBottom: Spacing.lg },
  subtitle: {
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  uploadIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  dropZoneTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  dropZoneHint: {
    fontSize: 13,
  },
  section: { marginTop: Spacing.sm },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    opacity: 0.9,
  },
  emptyHint: {
    fontSize: 14,
    paddingVertical: Spacing.lg,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  pdfIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  listItemText: { flex: 1, minWidth: 0 },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileMeta: { fontSize: 12 },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
