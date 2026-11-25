import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import BlinkingCursor from '@/components/BlinkingCursor';

export type OTPInputHandle = {
  clear: () => void;
  focus: () => void;
};

type Props = {
  length?: number;
  autoFocus?: boolean;
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
  appearance?: 'default' | 'glass';
};

const OTPInputText = forwardRef<OTPInputHandle, Props>(
  (
    {
      length = 6,
      autoFocus = true,
      onChange,
      onComplete,
      appearance = 'default',
    },
    ref,
  ) => {
    const { width } = useWindowDimensions();
    const sideInset = Math.max(24, Math.min(48, width * 0.11));
    const otpGap = appearance === 'glass' ? 6 : 12;
    const glassBoxWidth = Math.min(
      48,
      Math.max(32, (width - sideInset * 2 - otpGap * (length - 1)) / length),
    );
    const [code, setCode] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    // Focus hidden input when component loads
    useEffect(() => {
      if (!autoFocus) {
        return;
      }
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }, [autoFocus]);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => {
        setCode('');
        setActiveIndex(0);
        onChange?.('');
        inputRef.current?.focus();
      },
    }));

    // Update state and notify parent
    const commit = (nextCode: string, nextIndex: number) => {
      setCode(nextCode);
      setActiveIndex(nextIndex);

      if (nextCode !== code) {
        onChange?.(nextCode);
        if (nextCode.length === length) {
          onComplete?.(nextCode);
        }
      }
    };

    // User taps an OTP box (cannot jump past the first empty box)
    const handleBoxPress = (index: number) => {
      setActiveIndex(Math.min(index, code.length, length - 1));
      inputRef.current?.focus();
    };

    // Backspace: remove the digit under the cursor, or the previous one
    const handleBackspace = () => {
      if (!code) {
        return;
      }

      const hasValue = activeIndex < code.length;
      const removeAt = hasValue ? activeIndex : activeIndex - 1;
      if (removeAt < 0) {
        return;
      }

      const nextCode = code.slice(0, removeAt) + code.slice(removeAt + 1);
      commit(nextCode, hasValue ? Math.max(removeAt - 1, 0) : removeAt);
    };

    // Typing / replacing / pasting / SMS autofill
    // The hidden input's value is always `code`, so every change is a diff
    // against it. This makes backspace a normal onChangeText event, which
    // also works on Android keyboards that skip onKeyPress for empty inputs.
    const handleChangeText = (text: string) => {
      // Text got shorter -> Backspace
      if (text.length < code.length && code.startsWith(text)) {
        handleBackspace();
        return;
      }

      const inserted = text.startsWith(code) ? text.slice(code.length) : text;
      const digits = inserted.replace(/[^0-9]/g, '');

      // Nothing valid entered
      if (!digits) {
        return;
      }

      // Full code (autofill / paste): replace everything
      if (digits.length >= length) {
        commit(digits.slice(0, length), length - 1);
        return;
      }

      // Type or replace starting at the active box
      const at = Math.min(activeIndex, code.length);
      const nextCode = (
        code.slice(0, at) +
        digits +
        code.slice(at + digits.length)
      ).slice(0, length);

      commit(nextCode, Math.min(at + digits.length, length - 1));
    };

    return (
      <View style={styles.container}>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          importantForAutofill="yes"
          accessibilityLabel="Enter verification code"
          caretHidden
          style={styles.hiddenInput}
        />

        {/* Visual OTP boxes */}
        <View style={[styles.otpContainer, appearance === 'glass' && styles.glassOtpContainer, { gap: otpGap }]}>
          {Array.from({ length }).map((_, index) => {
            const value = code[index] ?? '';
            const isActive = isFocused && activeIndex === index;

            return (
              <Pressable
                key={index}
                onPress={() => handleBoxPress(index)}
                style={styles.boxWrapper}
              >
                <View
                  style={[
                    styles.otpBox,
                    appearance === 'glass' && [
                      styles.glassOtpBox,
                      { width: glassBoxWidth, height: glassBoxWidth + 10 },
                    ],
                    isActive && (appearance === 'glass' ? styles.glassActiveOtpBox : styles.activeOtpBox),
                  ]}
                >
                  {value !== '' && <Text style={styles.otpText}>{value}</Text>}
                  {isActive && <BlinkingCursor />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  },
);

export default OTPInputText;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },

  // Hidden keyboard input
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },

  otpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  boxWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  otpBox: {
    width: 58,
    height: 67,
    borderWidth: 1,
    borderColor: '#777777',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  activeOtpBox: {
    borderColor: '#FFFFFF',
  },

  otpText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  glassOtpContainer: {
    width: '100%',
  },
  glassOtpBox: {
    borderColor: 'rgba(166, 187, 137, 0.46)',
    borderRadius: 12,
    backgroundColor: 'rgba(12, 19, 13, 0.62)',
  },
  glassActiveOtpBox: {
    borderColor: '#D9C77E',
  },
});
