import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, ChevronRight } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { useProbation } from '@/services/queries';
import ProfileSubScreen, {
  ComingSoon,
  GUTTER,
  RowDivider,
  SUB_COLORS,
  SUB_RIPPLE,
  SubSection,
  subText,
} from '../../component/ProfileSubScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HOW_IT_WORKS = [
  'Ask a question in the Journal, or ask for advice for the day.',
  'Draw your clue: six letters from quantum random numbers. There is no daily limit: interpret each clue, then ask your next question.',
  'Interpret it: split the letters into meaningful parts (words, abbreviations, names, words from any language), say what each means and combine them into one message for your question. Write it or speak it.',
  'The AI judge reads your interpretation once. It judges the craft of interpreting, not your beliefs.',
  'Rate how eerie and how satisfying the reading felt, and write notes and photos about your day at any time.',
  'Home shows your progress over days, months and years.',
];

/** The row that names a help topic: opens it in place, or leads to its own screen. */
const TopicRow = ({
  title,
  open,
  onPress,
}: {
  title: string;
  // Given for a topic that opens in place; left out for one that leads elsewhere.
  open?: boolean;
  onPress: () => void;
}) => {
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={open === undefined ? undefined : { expanded: open }}
      onPress={onPress}
      android_ripple={SUB_RIPPLE}
      style={({ pressed }) => [styles.topicRow, pressed && styles.pressed]}
    >
      <Text style={[subText.rowTitle, styles.topicTitle]}>{title}</Text>
      <Chevron size={18} color="#6F8274" strokeWidth={1.6} />
    </Pressable>
  );
};

/** A help topic that opens in place. */
const Topic = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TopicRow title={title} open={open} onPress={() => setOpen(o => !o)} />
      {open ? <View style={styles.topicBody}>{children}</View> : null}
    </View>
  );
};

/** Help: how Papolona works, probation, the Pyramid Art story, and what is still to come. */
const HelpInformation = () => {
  const navigation = useNavigation<Nav>();
  const probation = useProbation();
  const required = probation.data?.readingsRequired ?? 28;

  return (
    <ProfileSubScreen title="Help & information">
      <SubSection bleed>
        <Topic title="How Papolona works">
          {HOW_IT_WORKS.map((step, index) => (
            <View key={step} style={styles.step}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={[subText.body, styles.stepText]}>{step}</Text>
            </View>
          ))}
        </Topic>
        <RowDivider inset="gutter" />
        <Topic title="Apprenticeship & publishing">
          <Text style={subText.body}>
            Every new account starts as an apprentice. Each interpretation the
            AI judge passes is one day forward; a reading that doesn't pass
            keeps you on the same day until a later one passes. After {required}{' '}
            passed readings your apprenticeship is complete and you can join the
            collective, free.
          </Text>
          <Text style={subText.body}>
            Members may start a series of readings: Single (1) and Twin (2) for
            practice, or Level 1 (3), Level 2 (6), Level 3 (12) and Level 4
            (24). Every reading Papolona passes in a series earns a butterfly
            emblem; single and twin emblems are practice and cannot become NFTs.
            A completed Level 1 to 4 series, with all its emblems, can be
            converted into one NFT: Level 1 $90, Level 2 $180, Level 3 $540,
            Level 4 $2,160. Emblems from an unfinished series stay in your
            gallery but cannot be converted.
          </Text>
          <Text style={subText.body}>
            Active members have received the Sensitisation Package (the
            meditation stone, the Enigma Prism Triptych, initiation materials
            and a retreat stay at Château de Puycharnaud) and convert at least
            one emblem every 60 days. The retreat at Château de Puycharnaud is
            by application, from the Marketplace. Only active members can sell
            NFTs on the marketplace in Discover, where anyone can buy them;
            Papolona keeps half of each sale. Payments are demo payments for
            now.
          </Text>
          <Text style={subText.body}>
            Each completed emblem is private until you make it public with the
            switch on its page: it then joins the collective artwork, a public
            wall of members' emblems in Discover. It's free, and the meanings of
            its readings become visible to anyone who opens it. You can make it
            private again at any time. An NFT you put up for sale is always
            public, until you withdraw it from sale.
          </Text>
        </Topic>
        <RowDivider inset="gutter" />
        <Topic title="Memberships">
          <Text style={subText.body}>
            Explorer: free after graduation. Unlimited Single, Twin and Level 1
            readings. Explorers keep their emblems but cannot convert or sell
            them; upgrade to Creator or Collector to do so.
          </Text>
          <Text style={subText.body}>
            Creator: readings at every level. Creators convert their completed
            series into certified NFTs and sell them through Papolona. A Creator
            converts at least one series every two months.
          </Text>
          <Text style={subText.body}>
            Collector: supports the ecosystem every two months, either by buying
            a member's NFT and keeping a minimum wallet balance, or by paying
            the Collector fee; or by buying art worth 10k or more in a 12-month
            period, which covers that period. Readings are optional, at any
            level.
          </Text>
          <Text style={subText.body}>
            A Creator or Collector who does not meet these terms within two
            months returns to Explorer, and can upgrade again at any time.
          </Text>
        </Topic>
        <RowDivider inset="gutter" />
        <Topic title="Our constitution">
          <Text style={subText.body}>
            Papolona exists to transform personal insight into collective value.
          </Text>
          <Text style={subText.body}>
            Every Papolona-certified NFT is the joint work of two contributors:
            the member, whose readings and interpretations give it meaning, and
            the Papolona ecosystem, which provides the method, the quantum clue
            source, AI validation, certification, the marketplace and long-term
            stewardship. Neither exists in its marketable form without the
            other.
          </Text>
          <Text style={subText.body}>
            Papolona and the creator are therefore co-originators of every
            certified NFT. Papolona acts as the member's agent, every sale is
            completed through Papolona, and revenue from those sales is shared
            equally between the creator and the ecosystem. Members remain free
            to promote their own work. Papolona recommends a minimum resale
            price for each level; the seller can negotiate the final price,
            provided it is no lower.
          </Text>
        </Topic>
        <RowDivider inset="gutter" />
        <Topic title="Where Papolona's share goes">
          <Text style={subText.body}>
            Papolona's half is not a commission. It is reinvested in the
            ecosystem that makes every NFT possible:
          </Text>
          {[
            'Operating, securing and developing the platform',
            'Supporting and guiding members',
            'Research into the Papolona method',
            'Funding member projects selected through collective guidance',
            'A reserve that keeps the ecosystem sustainable',
          ].map(item => (
            <View key={item} style={styles.step}>
              <Text style={styles.stepNumber}>•</Text>
              <Text style={[subText.body, styles.stepText]}>{item}</Text>
            </View>
          ))}
          <Text style={subText.body}>
            Papolona will publish how this share is allocated, who decides on
            its use and how those decisions are reviewed.
          </Text>
        </Topic>
        <RowDivider inset="gutter" />
        <TopicRow
          title="Pyramid Art story"
          onPress={() => navigation.navigate(SCREENS.pyramidArtStory)}
        />
      </SubSection>

      <SubSection title="Still to come">
        <ComingSoon
          title="General conditions"
          text="The terms of use and privacy policy will be published here once their final wording is ready."
        />
        <View style={styles.soonGap} />
        <ComingSoon
          title="Contact support"
          text="A way to reach the Papolona team will be added here once the support channel is set up."
        />
      </SubSection>
    </ProfileSubScreen>
  );
};

export default HelpInformation;

const styles = StyleSheet.create({
  topicRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(16),
    paddingHorizontal: GUTTER,
  },
  topicTitle: { flex: 1 },
  pressed: { backgroundColor: 'rgba(232, 213, 138, 0.07)' },
  topicBody: {
    gap: hp(12),
    paddingHorizontal: GUTTER,
    paddingTop: hp(4),
    paddingBottom: hp(20),
  },
  step: { flexDirection: 'row', gap: wp(8) },
  // The steps happen in this order, so each carries its number.
  stepNumber: {
    width: 20,
    color: SUB_COLORS.gold,
    fontSize: font(15),
    lineHeight: font(23),
    fontWeight: '600',
  },
  stepText: { flex: 1 },
  soonGap: { height: hp(20) },
});
