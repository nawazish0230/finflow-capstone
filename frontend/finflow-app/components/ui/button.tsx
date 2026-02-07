import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  const bg = isPrimary ? colors.primary : isGhost ? 'transparent' : colors.card;
  const borderWidth = isGhost ? 1.5 : 0;
  const borderColor = colors.border;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderWidth, borderColor, opacity: pressed ? 0.9 : 1 },
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={isPrimary || isGhost ? colors.primary : colors.text} />
      ) : (
        <ThemedText
          style={[
            styles.text,
            { color: isPrimary ? '#fff' : colors.text },
          ]}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
