import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...rest }: CardProps) {
  const scheme = useColorScheme() ?? 'light';
  const backgroundColor = Colors[scheme].card;
  const borderColor = Colors[scheme].border;

  return (
    <View
      style={[styles.card, { backgroundColor, borderColor }, style]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
});
