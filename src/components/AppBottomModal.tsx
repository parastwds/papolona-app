import { COLORS } from '@/theme/colors';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_PADDING_BOTTOM = 30;

interface AppBottomModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Artwork laid behind the sheet's content, under a veil that keeps text readable.
  background?: ImageSourcePropType;
}

/**
 * Height of the on-screen keyboard. With edge-to-edge Android the window no
 * longer resizes for the keyboard, so the sheet lifts itself by this amount.
 */
const useKeyboardHeight = () => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, event =>
      setHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
};

const AppBottomModal: React.FC<AppBottomModalProps> = ({
  visible,
  onClose,
  children,
  background,
}) => {
  const keyboardHeight = useKeyboardHeight();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Bottom Modal */}
        <View
          style={[
            styles.modalContainer,
            { paddingBottom: SHEET_PADDING_BOTTOM + keyboardHeight },
          ]}
        >
          {background ? (
            <>
              <Image
                source={background}
                resizeMode="cover"
                style={styles.artwork}
              />
              <View style={styles.veil} />
            </>
          ) : null}

          {/* Drag indicator */}
          <View style={styles.handle} />

          {/* Scrolls when the content does not fit above the keyboard */}
          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default AppBottomModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  modalContainer: {
    minHeight: SCREEN_HEIGHT * 0.3,
    maxHeight: '94%',
    backgroundColor: COLORS.bottomBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    // Clips the artwork to the rounded top corners.
    overflow: 'hidden',
  },

  // Sized to the sheet, which is as tall as its content.
  artwork: {
    ...StyleSheet.absoluteFill,
    width: undefined,
    height: undefined,
  },

  veil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 13, 10, 0.66)',
  },

  content: {
    flexGrow: 0,
  },

  handle: {
    width: 45,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#666666',
    alignSelf: 'center',
    marginBottom: 20,
  },
});
