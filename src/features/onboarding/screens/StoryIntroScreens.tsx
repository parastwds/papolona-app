import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image, ImageSource } from 'expo-image';
import Svg, {
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Mask,
  Rect,
  Stop,
} from 'react-native-svg';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ImageIcon from 'lucide-react-native/icons/image';

import EdgeFade from '@/components/EdgeFade';
import LivingEmblem from '@/components/LivingEmblem';
import ZoomableImageViewer from '@/components/ZoomableImageViewer';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation';
import { TOTAL_INTRO_STEPS } from '../constants';
import ButterflyBackground from '@/components/ButterflyBackground';
import StarField from '@/components/StarField';

type OpeningProps = NativeStackScreenProps<RootStackParamList, 'Opening'>;
type OpeningHowItWorksProps = NativeStackScreenProps<
  RootStackParamList,
  'OpeningHowItWorks'
>;
type OpeningFeedbackProps = NativeStackScreenProps<
  RootStackParamList,
  'OpeningFeedback'
>;
type OpeningEnigmaPrismProps = NativeStackScreenProps<
  RootStackParamList,
  'OpeningEnigmaPrism'
>;
type OpeningLivingExperimentProps = NativeStackScreenProps<
  RootStackParamList,
  'OpeningLivingExperiment'
>;
// The opening screens run between Welcome and the questionnaire: steps 1–5.
const GUIDING_QUESTION =
  'Can guidance emerge when human intuition enters into dialogue with nature’s quantum level processes?';

const OpeningScreen = ({ navigation }: OpeningProps) => (
  <StoryIntro
    step={1}
    eyebrow={null}
    title="Papolona"
    titleImage={require('../../../../assets/papolona_wordmark_gold.webp')}
    tagline="A collaborative exploration of intuition"
    stars
    raised
    content={[
      'Einstein expressed his perception: “The intuitive mind is a sacred gift and the rational mind a faithful servant, but we’ve created a society honouring the servant that forgets the gift”. Our self-imposed servitude is the prison, and Papolona must be our key to liberation.',
      'Built around a simple question:',
      { heading: GUIDING_QUESTION },
      'Partly inspired by Roger Penrose and Stuart Hameroff’s Orch-OR theory of consciousness, Papolona explores the possibility that intuition may be connected to deeper processes within nature. Rather than asking participants to adopt a belief system, it offers a practical way to investigate this possibility through direct experience.',
      {
        image: require('../../../../assets/orch_or_overview.jpg'),
        linkText: 'See the Orch OR overview',
        label:
          'Orch OR overview: quantum processes in microtubules, orchestration, objective reduction, and the conscious moment.',
      },
    ]}
    onBack={() => navigation.goBack()}
    onContinue={() => navigation.navigate(SCREENS.openingHowItWorks)}
  />
);

const OpeningHowItWorksScreen = ({ navigation }: OpeningHowItWorksProps) => (
  <StoryIntro
    step={2}
    eyebrow={null}
    title="How It Works"
    raised
    content={[
      'You ask an existential question or simply ask for guidance on your current predicament.',
      'Papolona then presents a sequence of clues generated through quantum randomness. Your task is to interpret those clues using intuition, reflection, and personal judgement.',
      'There are no right or wrong answers. What matters is the meaning you discover.',
      'Your interpretation becomes part of a unique collaborative artwork, preserved as an NFT. Anyone can join as a co-artist and no art skill is required.',
      { emblem: true },
      'Whether your experience reflects creativity, coincidence, intuition, synchronicity, or interaction with a deeper layer of reality is for you to decide.',
      'But you should know, practice makes perfect. The process is cumulative. Each interpretation influences future questions, perceptions, and decisions, creating an ongoing dialogue between you and the system.',
    ]}
    onBack={() => navigation.goBack()}
    onContinue={() => navigation.navigate(SCREENS.openingFeedback)}
  />
);

const OpeningFeedbackScreen = ({ navigation }: OpeningFeedbackProps) => (
  <StoryIntro
    step={3}
    eyebrow={null}
    title="The Feedback Principle"
    raised
    content={[
      'Papolona is built on a simple premise:',
      'If intuition and the clues arise from related underlying processes, then their interaction may be more than random; in other words, randomness may reflect a hidden pattern of intelligence.',
      'Every interpretation influences future interpretation.',
      'A subtle shift in perspective can change a decision. A decision can change an outcome. An outcome can reshape understanding.',
      'Over time, these small changes can accumulate into significant personal and collective consequences. This is Papolona’s feedback loop, a practical expression of the Butterfly Effect.',
    ]}
    onBack={() => navigation.goBack()}
    onContinue={() => navigation.navigate(SCREENS.openingEnigmaPrism)}
  />
);

const OpeningEnigmaPrismScreen = ({ navigation }: OpeningEnigmaPrismProps) => (
  <StoryIntro
    step={4}
    eyebrow={null}
    title="The Enigma Prism"
    raised
    picture={{
      source: require('../../../../assets/enigma_prism.jpg'),
      aspectRatio: 1520 / 1600,
      label: 'The Enigma Prism, a triangular artwork by Mark Dolamore',
    }}
    content={[
      'Papolona was created by systems artist Mark Dolamore, whose work draws on decades of research into synchronicity or meaningful coincidence.',
      'Through this work, Dolamore developed an artistic framework called The Enigma Prism. It reveals a deeper pattern of meaning and connection. Einstein, Pauli, and Jung referred to as Unus Mundus, the underlying unity between mind and reality.',
      'Access to The Enigma Prism becomes available after Papolona’s 28-day onboarding period.',
      'As participants progress beyond, many report discovering unexpectedly relevant insights, thought-provoking connections, and a heightened awareness of what Dolamore describes as nature’s “Dark Beauty”.',
    ]}
    onBack={() => navigation.goBack()}
    onContinue={() => navigation.navigate(SCREENS.openingLivingExperiment)}
  />
);

const OpeningLivingExperimentScreen = ({
  navigation,
}: OpeningLivingExperimentProps) => (
  <StoryIntro
    step={5}
    eyebrow={null}
    title="A Living Experiment"
    raised
    content={[
      'Papolona does not ask you to accept any doctrine or belief.',
      'Instead, it invites you to participate in the ongoing experiment.',
      'The clues originate from quantum randomness. The interpretations originate from human perception.',
      'Together they create a unique stream of judgement, reflection, and creative expression preserved as a growing body of collaborative art and collective inquiry.',
      'At its heart, Papolona asks a single question:',
      { heading: GUIDING_QUESTION },
      'Only your own experience can answer that.',
    ]}
    onBack={() => navigation.goBack()}
    onContinue={() => navigation.navigate(SCREENS.questionnaire)}
  />
);

/**
 * A picture whose edges melt into the background instead of ending at a hard border. Only a thin
 * band along each edge fades (no oval vignette), so the artwork itself stays at full strength.
 */
const FeatheredImage = ({
  source,
  aspectRatio,
}: {
  source: number;
  aspectRatio: number;
}) => {
  const width = 1000;
  const height = Math.round(width / aspectRatio);
  // How much of each side fades out.
  const band = 0.07;
  // react-native-svg needs each Stop as a direct child of its gradient, so they're built per use.
  const edgeStops = () => [
    <Stop key="a" offset="0" stopColor="#fff" stopOpacity={0} />,
    <Stop key="b" offset={band} stopColor="#fff" stopOpacity={1} />,
    <Stop key="c" offset={1 - band} stopColor="#fff" stopOpacity={1} />,
    <Stop key="d" offset="1" stopColor="#fff" stopOpacity={0} />,
  ];
  return (
    <Svg
      viewBox={`0 0 ${width} ${height}`}
      style={[styles.featheredImage, { aspectRatio }]}
    >
      <Defs>
        <LinearGradient id="featherX" x1="0" y1="0" x2="1" y2="0">
          {edgeStops()}
        </LinearGradient>
        <LinearGradient id="featherY" x1="0" y1="0" x2="0" y2="1">
          {edgeStops()}
        </LinearGradient>
        <Mask id="featherMaskX">
          <Rect width={width} height={height} fill="url(#featherX)" />
        </Mask>
        <Mask id="featherMaskY">
          <Rect width={width} height={height} fill="url(#featherY)" />
        </Mask>
      </Defs>
      {/* Two masks, one per direction, so the corners fade from both sides. */}
      <G mask="url(#featherMaskY)">
        <SvgImage
          href={source}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
          mask="url(#featherMaskX)"
        />
      </G>
    </Svg>
  );
};

// A paragraph, a small heading, or a list with its own markers (A–D, 1–4).
type StoryBlock =
  | string
  | { heading: string }
  | { list: string[]; markers: string[] }
  // A link to a bundled picture, which opens full screen when tapped.
  | { image: number; linkText: string; label: string }
  // The living, zoomable Papolona emblem.
  | { emblem: true };

interface StoryIntroProps {
  // Position in the numbered intro steps; without it the counter and progress bar are hidden.
  step?: number;
  // The small label above the title; null hides it.
  eyebrow?: string | null;
  title: string;
  // Shown instead of the title text (which then becomes its accessibility label).
  titleImage?: ImageSource | number;
  // Words shown just above the title image, e.g. "Welcome to".
  titlePrefix?: string;
  // A short line centred under the title, larger than the body text.
  tagline?: string;
  // Draws a twinkling star field over the background.
  stars?: boolean;
  // An artwork shown above the title; tapping it opens it full screen.
  picture?: { source: number; aspectRatio: number; label: string };
  content?: StoryBlock[];
  // Sits the content higher on the screen than the other story screens.
  raised?: boolean;
  onBack: () => void;
  onContinue: () => void;
}

const StoryIntro = ({
  step,
  eyebrow = 'PAPOLONA INTRODUCES',
  title,
  titleImage,
  titlePrefix,
  tagline,
  stars = false,
  picture,
  content = [],
  raised = false,
  onBack,
  onContinue,
}: StoryIntroProps) => {
  const [openImage, setOpenImage] = useState<{
    image: number;
    label: string;
  } | null>(null);
  return (
    <ButterflyBackground style={styles.background}>
      {stars && <StarField />}
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              hitSlop={10}
              style={styles.headerAction}
            >
              <ChevronLeft size={16} color={COLORS.gold} strokeWidth={1.8} />
              <Text style={styles.headerActionText}>Back</Text>
            </Pressable>
            {step !== undefined && (
              <Text style={styles.stepCount}>
                {String(step).padStart(2, '0')} /{' '}
                {String(TOTAL_INTRO_STEPS).padStart(2, '0')}
              </Text>
            )}
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.storyScroll}>
          <ScrollView
            style={styles.storyScroll}
            contentContainerStyle={[
              styles.storyContent,
              raised && styles.storyContentRaised,
              picture && styles.storyContentWithPicture,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
            {titleImage ? (
              <View
                accessible
                accessibilityRole="header"
                accessibilityLabel={title}
              >
                {titlePrefix && (
                  <Text style={styles.titlePrefix}>{titlePrefix}</Text>
                )}
                <Image
                  source={titleImage}
                  contentFit="contain"
                  style={styles.titleImage}
                />
              </View>
            ) : (
              <Text style={styles.title}>{title}</Text>
            )}
            {tagline && <Text style={styles.tagline}>{tagline}</Text>}
            {content.map((block, index) => {
              if (typeof block === 'string') {
                return (
                  <Text key={index} style={styles.body}>
                    {block}
                  </Text>
                );
              }
              if ('heading' in block) {
                return (
                  <Text key={index} style={styles.sectionHeading}>
                    {block.heading}
                  </Text>
                );
              }
              if ('emblem' in block) {
                return <LivingEmblem key={index} />;
              }
              if ('image' in block) {
                return (
                  <Pressable
                    key={index}
                    accessibilityRole="button"
                    accessibilityLabel={block.linkText}
                    accessibilityHint={`Opens an image: ${block.label}`}
                    onPress={() =>
                      setOpenImage({ image: block.image, label: block.label })
                    }
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.imageLink,
                      pressed && styles.imageLinkPressed,
                    ]}
                  >
                    <ImageIcon
                      size={16}
                      color={COLORS.gold}
                      strokeWidth={1.8}
                    />
                    <Text style={styles.imageLinkText}>{block.linkText}</Text>
                  </Pressable>
                );
              }
              return (
                <View key={index} style={styles.list}>
                  {block.list.map((item, itemIndex) => (
                    <View key={item} style={styles.listItem}>
                      <Text style={styles.listMarker}>
                        {block.markers[itemIndex]}
                      </Text>
                      <Text style={styles.listText}>{item}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
            {/* The artwork closes the screen, below the text. */}
            {picture && (
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel={picture.label}
                accessibilityHint="Opens the image full screen"
                onPress={() =>
                  setOpenImage({ image: picture.source, label: picture.label })
                }
                style={styles.picture}
              >
                <FeatheredImage
                  source={picture.source}
                  aspectRatio={picture.aspectRatio}
                />
              </Pressable>
            )}
          </ScrollView>
          <EdgeFade />
          </View>
          {openImage !== null && (
            <ZoomableImageViewer
              source={openImage.image}
              label={openImage.label}
              onClose={() => setOpenImage(null)}
            />
          )}
          <View style={styles.footer}>
            <View
              style={[
                styles.progressTrack,
                step === undefined && styles.progressHidden,
              ]}
            >
              {step !== undefined && (
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(step / TOTAL_INTRO_STEPS) * 100}%` },
                  ]}
                />
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              onPress={onContinue}
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.nextButtonPressed,
              ]}
            >
              <ChevronRight
                size={24}
                color={COLORS.paleGold}
                strokeWidth={1.8}
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ButterflyBackground>
  );
};

const COLORS = {
  gold: '#D9C77E',
  paleGold: '#EFE4B3',
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#020905',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 26,
    backgroundColor: 'rgba(0, 5, 2, 0.28)',
  },
  content: {
    flex: 1,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAction: {
    minWidth: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerActionText: {
    color: '#A8B09A',
    fontSize: 13,
  },
  headerSpacer: {
    width: 52,
  },
  stepCount: {
    color: COLORS.gold,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  storyScroll: {
    flex: 1,
  },
  storyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: '40%',
    paddingBottom: 24,
  },
  // The content is centred in the space below paddingTop, so it rises by half of what is
  // taken off: 8% of the width lifts it about 16 points on a typical phone.
  storyContentRaised: {
    paddingTop: '32%',
  },
  // The artwork sits at the end, so leave room for it to clear the bottom fade.
  storyContentWithPicture: {
    paddingTop: '48%',
    paddingBottom: 56,
  },
  featheredImage: {
    width: '100%',
  },
  footer: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(217, 199, 126, 0.24)',
  },
  // Keeps the continue button on the right when there is no progress to show.
  progressHidden: {
    backgroundColor: 'transparent',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
  },
  eyebrow: {
    marginBottom: 12,
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
  },
  // Sized for the gold wordmark (2000×668): its letters come out about as tall as the title text,
  // and the negative margins cancel the transparent space above and below them. Centred: the
  // letters sit in the middle of the image, so its side padding is equal.
  titleImage: {
    width: 240,
    aspectRatio: 2000 / 668,
    alignSelf: 'center',
    marginTop: -22,
    marginBottom: -17,
  },
  // Its edges fade out (see FeatheredImage), so the artwork's black backdrop melts into the page.
  picture: {
    alignSelf: 'center',
    width: '72%',
    marginTop: 24,
  },
  titlePrefix: {
    color: COLORS.paleGold,
    fontFamily: 'serif',
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 14,
    color: COLORS.paleGold,
    fontFamily: 'serif',
    fontSize: 19,
    lineHeight: 26,
    textAlign: 'center',
  },
  title: {
    color: COLORS.paleGold,
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '400',
    lineHeight: 39,
  },
  body: {
    marginTop: 16,
    color: '#D3D7C8',
    fontSize: 14,
    lineHeight: 21,
  },
  imageLink: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.5)',
    borderRadius: 18,
  },
  imageLinkPressed: {
    backgroundColor: 'rgba(217, 199, 126, 0.18)',
  },
  imageLinkText: {
    color: COLORS.paleGold,
    fontSize: 13,
  },
  sectionHeading: {
    marginTop: 26,
    color: COLORS.paleGold,
    fontFamily: 'serif',
    fontSize: 19,
    lineHeight: 26,
  },
  list: {
    marginTop: 12,
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
  },
  listMarker: {
    width: 16,
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  listText: {
    flex: 1,
    color: '#D3D7C8',
    fontSize: 14,
    lineHeight: 21,
  },
  nextButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 22,
  },
  nextButtonPressed: {
    backgroundColor: 'rgba(217, 199, 126, 0.18)',
  },
});

export {
  OpeningEnigmaPrismScreen,
  OpeningFeedbackScreen,
  OpeningHowItWorksScreen,
  OpeningLivingExperimentScreen,
  OpeningScreen,
};
