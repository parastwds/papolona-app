import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import { Play } from 'lucide-react-native';

interface IntroVideoProps {
  // A Vimeo link, or a direct video URL such as Cloudinary (MP4 or HLS .m3u8).
  uri: string;
  // Size and position; the player fills whatever box this gives it, so the
  // same instance can grow to full screen without restarting.
  style?: StyleProp<ViewStyle>;
}

type VimeoVideo = { id: string; hash?: string };

/**
 * Accepts vimeo.com/ID, vimeo.com/ID/HASH, vimeo.com/ID?h=HASH and
 * player.vimeo.com/video/ID. Unlisted videos need the hash to play.
 */
const parseVimeo = (uri: string): VimeoVideo | undefined => {
  const match = uri.match(
    /vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?(?:\?(.*))?/i,
  );
  if (!match) return undefined;
  const hash = match[2] ?? match[3]?.match(/(?:^|&)h=([0-9a-f]+)/i)?.[1];
  return { id: match[1], hash };
};

const vimeoPageUrl = ({ id, hash }: VimeoVideo) =>
  `https://vimeo.com/${id}${hash ? `/${hash}` : ''}`;

const vimeoPlayerUrl = ({ id, hash }: VimeoVideo) =>
  `https://player.vimeo.com/video/${id}?autoplay=1&playsinline=1&title=0&byline=0&portrait=0${
    hash ? `&h=${hash}` : ''
  }`;

/**
 * Cloudinary serves a still of any video when the extension is swapped for
 * .jpg; so_0 picks the first frame.
 */
const cloudinaryPoster = (uri: string) =>
  uri.includes('res.cloudinary.com') && uri.includes('/video/upload/')
    ? uri
        .replace('/video/upload/', '/video/upload/so_0,w_720/')
        .replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg')
    : undefined;

/** Vimeo's oEmbed API gives the thumbnail; it 404s while embedding is off. */
const useVimeoThumbnail = (video?: VimeoVideo) => {
  const [thumbnail, setThumbnail] = useState<string>();
  const pageUrl = video ? vimeoPageUrl(video) : undefined;

  useEffect(() => {
    if (!pageUrl) return;
    let cancelled = false;
    fetch(
      `https://vimeo.com/api/oembed.json?width=720&url=${encodeURIComponent(
        pageUrl,
      )}`,
    )
      .then(response => (response.ok ? response.json() : null))
      .then(body => {
        if (!cancelled && body?.thumbnail_url) setThumbnail(body.thumbnail_url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pageUrl]);

  return thumbnail;
};

/** Thumbnail with a play button; the video only loads once it is tapped. */
const IntroVideo = ({ uri, style }: IntroVideoProps) => {
  const [playing, setPlaying] = useState(false);
  const vimeo = parseVimeo(uri);
  const vimeoThumbnail = useVimeoThumbnail(vimeo);

  if (!uri) {
    return (
      <View style={[styles.frame, styles.centered, style]}>
        <Text style={styles.message}>Intro video coming soon.</Text>
      </View>
    );
  }

  if (playing) {
    return (
      <View style={[styles.frame, style]}>
        {vimeo ? (
          <WebView
            source={{ uri: vimeoPlayerUrl(vimeo) }}
            style={styles.webView}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            // The tap on our play button counts as the user's request to play.
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
          />
        ) : (
          <Playback uri={uri} onRetry={() => setPlaying(false)} />
        )}
      </View>
    );
  }

  const poster = vimeo ? vimeoThumbnail : cloudinaryPoster(uri);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Play intro video"
      onPress={() => setPlaying(true)}
      style={[styles.frame, styles.centered, style]}
    >
      {poster ? (
        <Image
          source={poster}
          contentFit="cover"
          transition={150}
          style={StyleSheet.absoluteFill}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.shade} />
      <View style={styles.playButton}>
        <Play size={26} color={COLORS.dark} fill={COLORS.dark} />
      </View>
    </Pressable>
  );
};

/** Mounted on tap, so nothing is downloaded until the user asks to play. */
const Playback = ({ uri, onRetry }: { uri: string; onRetry: () => void }) => {
  const player = useVideoPlayer(uri, videoPlayer => videoPlayer.play());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') setFailed(true);
    });
    return () => subscription.remove();
  }, [player]);

  if (failed) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={[StyleSheet.absoluteFill, styles.centered]}
      >
        <Text style={styles.message}>
          The video couldn't load. Tap to try again.
        </Text>
      </Pressable>
    );
  }

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls
      fullscreenOptions={{ enable: true }}
    />
  );
};

export default IntroVideo;

const COLORS = {
  gold: '#D9C77E',
  paleGold: '#EFE4B3',
  dark: '#172016',
};

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.62)',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 5, 2, 0.78)',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 5, 2, 0.25)',
  },
  playButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    // Optically centre the triangle.
    paddingLeft: 4,
    borderRadius: 30,
    backgroundColor: COLORS.gold,
  },
  message: {
    paddingHorizontal: 18,
    color: COLORS.paleGold,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
