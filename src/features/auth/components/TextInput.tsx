import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  findNodeHandle,
  ScrollView,
} from 'react-native';
import React, { forwardRef, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react-native';

import { wp, hp, font, ms } from '../../../utils/responsive';

interface AuthTextInputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  appearance?: 'default' | 'glass';
  containerStyle?: object;
  inputContainerStyle?: object;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

const AuthTextInput = forwardRef<TextInput, AuthTextInputProps>(
  (
    {
      label,
      required = false,
      error,
      leftIcon,
      rightIcon,
      secureTextEntry = false,
      appearance = 'default',
      placeholderTextColor = '#A8B09A',
      containerStyle,
      inputContainerStyle,
      editable = true,
      style,
      scrollViewRef,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const isPassword = secureTextEntry;
    const isMultiline = props.multiline;
    const isGlass = appearance === 'glass';

    const setRefs = (node: TextInput | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref)
        (ref as React.MutableRefObject<TextInput | null>).current = node;
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <View style={[styles.labelContainer, isGlass && styles.glassLabelContainer]}>
            <Text style={[styles.labelTxt, isGlass && styles.glassLabel]}>{label}</Text>
            {required ? <Text style={[styles.required, isGlass && styles.glassRequired]}>*</Text> : null}
          </View>
        ) : null}

        <View
          style={[
            styles.inputWrapper,
            isGlass && styles.glassInputWrapper,
            inputContainerStyle,
            isMultiline && styles.multilineContainer,
            isFocused && styles.inputContainerFocused,
            !editable && styles.inputContainerDisabled,
            error && styles.inputContainerError,
          ]}
        >
          {leftIcon ? <View style={[styles.leftIcon, isGlass && styles.glassLeftIcon]}>{leftIcon}</View> : null}
          <TextInput
            ref={setRefs}
            {...props}
            multiline={isMultiline}
            editable={editable}
            secureTextEntry={isPassword && !showPassword}
            placeholderTextColor={placeholderTextColor}
            style={[
              styles.input,
              isGlass && styles.glassInput,
              isMultiline && styles.multilineInput,
              !editable && styles.disabledText,
              style,
            ]}
            onFocus={event => {
              setIsFocused(true);

              // Scroll this field above the keyboard once it opens
              const nodeHandle = findNodeHandle(inputRef.current);
              const responder = scrollViewRef?.current?.getScrollResponder?.();
              if (nodeHandle && responder) {
                // extra padding above keyboard so the field isn't flush to it
                setTimeout(() => {
                  responder.scrollResponderScrollNativeHandleToKeyboard(
                    nodeHandle,
                    120,
                    true,
                  );
                }, 50);
              }

              props.onFocus?.(event);
            }}
            onBlur={event => {
              setIsFocused(false);
              props.onBlur?.(event);
            }}
          />

          {isPassword ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              activeOpacity={0.7}
              style={[styles.passwordButton, isGlass && styles.glassPasswordButton]}
              onPress={() => setShowPassword(prev => !prev)}
            >
              {isGlass ? (
                showPassword ? <EyeOff size={17} color="#89958A" /> : <Eye size={17} color="#89958A" />
              ) : (
                <Text style={styles.passwordText}>{showPassword ? 'Hide' : 'Show'}</Text>
              )}
            </TouchableOpacity>
          ) : rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  },
);

export default AuthTextInput;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(6),
  },
  labelTxt: {
    fontSize: font(16),
    lineHeight: font(20),
    fontWeight: '500',
    color: '#B3C7A8',
  },
  required: { marginLeft: wp(3), fontSize: font(14), color: '#D32F2F' },
  inputWrapper: {
    width: '100%',
    height: hp(52),
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#939988',
    borderRadius: ms(26),
  },
  multilineContainer: {
    height: hp(120),
    borderRadius: ms(28),
    alignItems: 'flex-start',
  },
  inputContainerFocused: {
    borderColor: '#A1BE94',
  },
  inputContainerError: {
    borderColor: '#D32F2F',
  },
  inputContainerDisabled: {
    backgroundColor: '#F3F3F3',
    borderColor: '#E5E5E5',
  },
  input: {
    flex: 1,
    minHeight: hp(48),
    paddingHorizontal: wp(8),
    paddingVertical: 0,
    fontSize: font(16),
    lineHeight: font(22),
    color: '#B3C7A8',
  },
  multilineInput: {
    height: hp(110),
    paddingTop: hp(15),
    paddingBottom: hp(15),
  },
  disabledText: {
    color: '#999999',
  },
  leftIcon: {
    marginLeft: wp(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIcon: {
    marginRight: wp(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordButton: {
    paddingHorizontal: wp(14),
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordText: {
    fontSize: font(13),
    color: '#D9C77E',
    fontWeight: '500',
  },
  glassLabelContainer: { marginBottom: 5 },
  glassLabel: { fontSize: 11, lineHeight: 14, color: '#D5D9CF' },
  glassRequired: { marginLeft: 3, fontSize: 12, color: '#E43932' },
  glassInputWrapper: {
    height: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 13,
  },
  glassInput: { minHeight: 38, paddingHorizontal: 10, fontSize: 12, lineHeight: 16 },
  glassLeftIcon: {
    marginLeft: 10,
    paddingRight: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(183, 194, 170, 0.28)',
  },
  glassPasswordButton: { paddingHorizontal: 10 },
  errorText: {
    marginTop: hp(5),
    fontSize: font(12),
    lineHeight: font(17),
    color: '#D32F2F',
  },
});
