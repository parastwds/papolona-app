import React from 'react';
import {
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { font } from '@/utils/responsive';

interface PhotoViewerProps {
  // A URL, or a bundled image from require().
  uri: string | number;
  name?: string;
  // Shown under the photo, e.g. an artwork's title and artist.
  title?: string;
  caption?: string;
  visible: boolean;
  onClose: () => void;
}

/** Full-screen, uncropped view of a photo. Tap anywhere or ✕ to close. */
const PhotoViewer = ({
  uri,
  name,
  title,
  caption,
  visible,
  onClose,
}: PhotoViewerProps) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <Pressable
        accessibilityLabel="Close photo"
        onPress={onClose}
        style={styles.backdrop}
      >
        <Image
          source={uri}
          contentFit="contain"
          cachePolicy="memory-disk"
          style={styles.image}
          accessibilityLabel={
            title ?? (name ? `${name} profile photo` : 'Profile photo')
          }
        />
        {title || caption ? (
          <View style={[styles.info, { bottom: insets.bottom + 24 }]}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {caption ? <Text style={styles.caption}>{caption}</Text> : null}
          </View>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close photo"
        onPress={onClose}
        android_ripple={CLOSE_RIPPLE}
        style={({ pressed }) => [
          styles.close,
          { top: insets.top + 8 },
          pressed && styles.closePressed,
        ]}
      >
        <X size={22} color="#F1EEE0" strokeWidth={1.8} />
      </Pressable>
    </Modal>
  );
};

export default PhotoViewer;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  image: {
    width: '100%',
    height: '80%',
  },
  info: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  title: {
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(20),
    textAlign: 'center',
  },
  caption: {
    marginTop: 4,
    color: '#A1BE94',
    fontSize: font(13),
    textAlign: 'center',
  },
  // A plain mark on a dark disc, so it stays readable over a bright photo.
  close: {
    position: 'absolute',
    right: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  closePressed: { opacity: 0.7 },
});

const CLOSE_RIPPLE = { color: 'rgba(241, 238, 224, 0.2)', borderless: true };
