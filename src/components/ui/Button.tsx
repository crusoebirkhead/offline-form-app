import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

type ButtonVariant = 'filled' | 'outlined' | 'success';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}

const PRIMARY = '#1894e1';
const PRIMARY_BORDER = 'rgba(33, 150, 243, 0.5)';
const PRIMARY_PRESSED = '#1278b8';
const SUCCESS = '#34a853';
const SUCCESS_PRESSED = '#2d8e47';

export default function Button({
  title,
  onPress,
  variant = 'filled',
  disabled = false,
  loading = false,
  accessibilityLabel,
}: ButtonProps) {
  const isOutlined = variant === 'outlined';
  const isSuccess = variant === 'success';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        isOutlined ? styles.outlined : isSuccess ? styles.success : styles.filled,
        pressed &&
          !disabled &&
          (isOutlined
            ? styles.outlinedPressed
            : isSuccess
              ? styles.successPressed
              : styles.filledPressed),
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isOutlined ? PRIMARY : '#fff'} />
      ) : (
        <Text
          style={[
            styles.text,
            isOutlined ? styles.outlinedText : styles.filledText,
            disabled && isOutlined && styles.outlinedTextDisabled,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 96,
    height: 56,
    minWidth: 64,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  filled: {
    backgroundColor: PRIMARY,
    shadowColor: 'rgba(8, 10, 12, 1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 4,
  },
  filledPressed: {
    backgroundColor: PRIMARY_PRESSED,
  },
  filledText: {
    color: '#fff',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: PRIMARY_BORDER,
  },
  outlinedPressed: {
    backgroundColor: 'rgba(24, 148, 225, 0.08)',
  },
  outlinedText: {
    color: PRIMARY,
  },
  outlinedTextDisabled: {
    color: 'rgba(24, 148, 225, 0.5)',
  },
  success: {
    backgroundColor: SUCCESS,
    shadowColor: 'rgba(8, 10, 12, 1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 4,
  },
  successPressed: {
    backgroundColor: SUCCESS_PRESSED,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  disabled: {
    opacity: 0.6,
  },
});
