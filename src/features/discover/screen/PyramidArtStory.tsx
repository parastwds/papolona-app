import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import ProfileSubScreen, {
  GUTTER,
  Segmented,
} from '@/features/profile/component/ProfileSubScreen';
import { font, hp } from '@/utils/responsive';
import { PYRAMID_ART_OVERVIEW, PYRAMID_ART_STORY } from '../pyramidArtStory';

type Section = 'story' | 'overview';

const SECTIONS = [
  {
    key: 'overview',
    label: 'Overview',
    title: 'Overview',
    blocks: PYRAMID_ART_OVERVIEW,
  },
  {
    key: 'story',
    label: 'Full story',
    title: 'The Pyramid',
    blocks: PYRAMID_ART_STORY,
  },
] as const;

/** Mark Dolamore's account of Pyramid Art: a short overview, or the story in full. */
const PyramidArtStory = () => {
  const [section, setSection] = useState<Section>('story');
  const current = SECTIONS.find(item => item.key === section)!;

  return (
    // Lays out its own body: the switch stays put while the text scrolls under it.
    <ProfileSubScreen title="Pyramid Art story" scroll={false}>
      <View style={styles.switch}>
        <Segmented
          accessibilityLabel="Which version to read"
          options={SECTIONS}
          value={section}
          onChange={setSection}
        />
      </View>

      <ScrollView
        // Remount per section so switching starts at the top.
        key={section}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text accessibilityRole="header" style={styles.title}>
          {current.title}
        </Text>
        <Text style={styles.byline}>By Mark Dolamore</Text>

        {current.blocks.map((block, index) => (
          <Text
            key={index}
            style={block.type === 'heading' ? styles.heading : styles.body}
            accessibilityRole={block.type === 'heading' ? 'header' : 'text'}
          >
            {block.text}
          </Text>
        ))}
      </ScrollView>
    </ProfileSubScreen>
  );
};

export default PyramidArtStory;

const styles = StyleSheet.create({
  switch: {
    paddingHorizontal: GUTTER,
    paddingTop: hp(8),
    paddingBottom: hp(12),
  },
  content: {
    paddingHorizontal: GUTTER,
    paddingTop: hp(12),
    paddingBottom: hp(56),
  },
  title: {
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(30),
    lineHeight: font(38),
  },
  byline: {
    marginTop: 4,
    color: '#A1BE94',
    fontSize: font(14),
  },
  // Well clear of the paragraph before it, close to the one it introduces.
  heading: {
    marginTop: hp(32),
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(21),
    lineHeight: font(28),
  },
  body: {
    marginTop: hp(12),
    color: '#D5D8CB',
    fontSize: font(16),
    lineHeight: font(26),
  },
});
