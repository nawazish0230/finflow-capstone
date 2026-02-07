import React, { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type MessageRole = 'ai' | 'user';

interface Message {
  id: string;
  role: MessageRole;
  text: string;
}

const INITIAL_AI_MESSAGE: Message = {
  id: 'welcome',
  role: 'ai',
  text: "Hi! I'm your personal spending assistant. Ask me anything about your finances!",
};

const MOCK_REPLIES = [
  "I can help with that. Based on your recent transactions, your spending looks stable. Is there a specific category you want to analyze?",
  "Your top spending category this month is Food. Consider setting a budget for dining out to stay on track.",
  "Here’s a quick summary: total debits are up slightly from last month. Would you like a breakdown by category?",
  "I don’t have access to your full history yet. Upload more statements to get better insights!",
];

function TypingIndicator() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  React.useEffect(() => {
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      false
    );
    dot2.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      false
    );
    dot3.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: 300 }),
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      false
    );
  }, [dot1, dot2, dot3]);

  const style1 = useAnimatedStyle(() => ({
    opacity: 0.4 + dot1.value * 0.6,
    transform: [{ translateY: -dot1.value * 4 }],
  }));
  const style2 = useAnimatedStyle(() => ({
    opacity: 0.4 + dot2.value * 0.6,
    transform: [{ translateY: -dot2.value * 4 }],
  }));
  const style3 = useAnimatedStyle(() => ({
    opacity: 0.4 + dot3.value * 0.6,
    transform: [{ translateY: -dot3.value * 4 }],
  }));

  return (
    <View style={styles.typingRow}>
      <View style={[styles.avatarAi, { backgroundColor: colors.primary + '25' }]}>
        <MaterialIcons name="auto-awesome" size={20} color={colors.primary} />
      </View>
      <View style={[styles.bubbleAi, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.dot, { backgroundColor: colors.text }, style1]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.text }, style2]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.text }, style3]} />
        </View>
      </View>
    </View>
  );
}

export default function AIChatScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = colors.primary;

  const [messages, setMessages] = useState<Message[]>([INITIAL_AI_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Simulate AI reply (no API)
    const delay = 1200 + Math.random() * 800;
    setTimeout(() => {
      const replyText = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: replyText,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, delay);
  }, [input, loading]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <Animated.View entering={FadeIn.duration(260)} style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.avatarAi, { backgroundColor: primary + '25' }]}>
          <MaterialIcons name="smart-toy" size={28} color={primary} />
        </View>
        <View style={styles.headerText}>
          <ThemedText style={styles.headerTitle}>AI Assistant</ThemedText>
          <View style={styles.onlineRow}>
            <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
            <ThemedText style={[styles.onlineText, { color: textSecondary }]}>Online</ThemedText>
          </View>
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((msg, index) => (
            <Animated.View
              key={msg.id}
              entering={FadeInDown.duration(280).springify()}
              style={msg.role === 'ai' ? styles.msgRowAi : styles.msgRowUser}>
              {msg.role === 'ai' && (
                <View style={[styles.avatarAi, { backgroundColor: primary + '25' }]}>
                  <MaterialIcons name="auto-awesome" size={20} color={primary} />
                </View>
              )}
              <View
                style={[
                  msg.role === 'ai' ? styles.bubbleAi : styles.bubbleUser,
                  msg.role === 'ai'
                    ? { backgroundColor: colors.card, borderColor: colors.border }
                    : { backgroundColor: primary },
                ]}>
                <ThemedText
                  style={[
                    styles.bubbleText,
                    { color: msg.role === 'user' ? '#fff' : colors.text },
                  ]}>
                  {msg.text}
                </ThemedText>
              </View>
              {msg.role === 'user' && (
                <View style={[styles.avatarUser, { backgroundColor: colors.border }]}>
                  <MaterialIcons name="person" size={20} color={colors.text} />
                </View>
              )}
            </Animated.View>
          ))}
          {loading && <TypingIndicator />}
        </ScrollView>

        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            placeholder="Ask about your spending..."
            placeholderTextColor={textSecondary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            editable={!loading}
            style={[styles.input, { color: colors.text }]}
          />
          <Pressable
            onPress={sendMessage}
            disabled={!input.trim() || loading}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: primary },
              pressed && { opacity: 0.85 },
              (!input.trim() || loading) && { opacity: 0.5 },
            ]}>
            <MaterialIcons name="send" size={22} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  avatarAi: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerText: {},
  headerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 13 },
  keyboard: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  msgRowAi: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  msgRowUser: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
    justifyContent: 'flex-end',
  },
  bubbleAi: {
    maxWidth: '80%',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleUser: {
    maxWidth: '80%',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderTopRightRadius: 4,
    marginLeft: Spacing.sm,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  avatarUser: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
