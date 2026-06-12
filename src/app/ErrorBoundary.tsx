import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography, radius } from '@core/theme/tokens';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
}

/**
 * Top-level React error boundary.
 *
 * Catches JavaScript errors in the render tree and shows a safe fallback UI
 * rather than a blank screen. Includes a "Restart App" option that reloads
 * the bundle via DevSettings (dev) or restarts the JS runtime (production).
 *
 * Errors are logged locally via Logger. No remote crash reporting (ADR-007).
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '', errorStack: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    const stack   = error instanceof Error ? (error.stack ?? '') : '';
    return { hasError: true, errorMessage: message, errorStack: stack };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    // Import lazily to avoid circular dependency at module load time
    void import('@core/logger/Logger').then(({ Logger }) => {
      Logger.error('ErrorBoundary', 'Unhandled render error', {
        message: error instanceof Error ? error.message : String(error),
        componentStack: info.componentStack ?? '',
      });
    });
  }

  private handleRestart = (): void => {
    // Reset boundary state so render tree can try again
    this.setState({ hasError: false, errorMessage: '', errorStack: '' });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            Something went wrong
          </Text>
          <Text style={styles.subtitle}>
            GuardianCircle encountered an unexpected error. Your data is safe.
          </Text>

          <ScrollView
            style={styles.detailBox}
            accessibilityLabel="Error details"
          >
            <Text style={styles.errorText} selectable>
              {this.state.errorMessage}
            </Text>
            {__DEV__ && this.state.errorStack !== '' && (
              <Text style={styles.stackText} selectable>
                {this.state.errorStack}
              </Text>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.button}
            onPress={this.handleRestart}
            accessibilityRole="button"
            accessibilityLabel="Restart GuardianCircle"
          >
            <Text style={styles.buttonText}>Restart App</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 480,
    elevation: 4,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.light.onSurface,
    marginBottom: spacing.md,
  },
  detailBox: {
    backgroundColor: colors.light.surfaceVariant,
    borderRadius: radius.md,
    padding: spacing.sm,
    maxHeight: 200,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.labelMedium,
    color: colors.danger,
    fontFamily: 'monospace',
  },
  stackText: {
    ...typography.labelMedium,
    color: colors.light.onSurfaceVariant,
    fontFamily: 'monospace',
    marginTop: spacing.sm,
  },
  button: {
    backgroundColor: colors.light.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    ...typography.labelLarge,
    color: colors.light.onPrimary,
  },
});
