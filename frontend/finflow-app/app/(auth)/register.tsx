import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Link, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/stores/auth-store";
import { Spacing } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function RegisterScreen() {
  const { register, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const backgroundColor = useThemeColor({}, "background");
  const errorColor = useThemeColor({}, "error");

  const handleRegister = async () => {
    setLocalError(null);
    clearError();
    if (!email.trim()) {
      setLocalError("Email is required");
      return;
    }
    if (!password) {
      setLocalError("Password is required");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password);
    } catch {
      // error set in store
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError ?? error;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title" style={styles.title}>
            Create account
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Sign up to manage your finances
          </ThemedText>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              importantForAutofill="yes"
            />
          </View>
          {displayError ? (
            <ThemedText style={[styles.errorText, { color: errorColor }]}>
              {displayError}
            </ThemedText>
          ) : null}
          <Button
            title="Sign up"
            onPress={handleRegister}
            loading={loading}
            style={styles.button}
          />

          <TouchableOpacity
            style={styles.footer}
            onPress={() => {
              clearError();
              setLocalError(null);
            }}
          >
            <ThemedText style={styles.footerText}>
              Already have an account?{" "}
            </ThemedText>
            <Link href={"/(auth)/login" as Href} asChild>
              <TouchableOpacity>
                <ThemedText type="link">Sign in</ThemedText>
              </TouchableOpacity>
            </Link>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    marginBottom: Spacing.xl,
    opacity: 0.8,
  },
  form: {
    marginBottom: Spacing.xs,
  },
  button: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  footerText: {
    fontSize: 15,
  },
  errorText: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
});
