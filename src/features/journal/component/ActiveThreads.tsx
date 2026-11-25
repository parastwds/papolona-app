import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';

export interface DiscoveryItem {
  id: string;
  title: string;
  source?: string;
  readings: string;
  lastActivity: string;
  image?: ImageSourcePropType;
}

interface ActiveThreadsProps {
  item: DiscoveryItem;
  onPress: (item: DiscoveryItem) => void;
  // Where the row sits in the list: the thread starts at the first and ends at the last.
  first?: boolean;
  last?: boolean;
}

/**
 * One day of the journal, as a knot on a thread: a line runs down the left of
 * the list through every day, with the day's photo or a mark at each knot.
 */
const ActiveThreads = ({ item, onPress, first, last }: ActiveThreadsProps) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(item)}
    >
      {/* The thread and this day's knot on it */}
      <View style={styles.rail}>
        <View style={[styles.line, first && styles.lineHidden]} />
        {item.image ? (
          <Image source={item.image} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.knot} />
        )}
        <View style={[styles.line, last && styles.lineHidden]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>

        <Text style={styles.metadata} numberOfLines={1}>
          {item.source
            ? `${item.source} · ${item.readings} · ${item.lastActivity}`
            : `${item.readings} · ${item.lastActivity}`}
        </Text>
      </View>

      {/* Arrow */}
      <View style={styles.arrowContainer}>
        <ChevronRight size={18} color="#6F8274" strokeWidth={1.6} />
      </View>
    </Pressable>
  );
};

export default ActiveThreads;

const THREAD = 'rgba(232, 213, 138, 0.45)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardPressed: {
    opacity: 0.7,
  },
  // The thread: a line above and below the knot, so rows join into one.
  rail: {
    width: wp(44),
    alignItems: 'center',
    marginRight: wp(12),
  },
  line: { flex: 1, width: 1, backgroundColor: THREAD },
  lineHidden: { backgroundColor: 'transparent' },
  knot: {
    width: 11,
    height: 11,
    marginVertical: 5,
    borderWidth: 2,
    borderColor: '#E8D58A',
    borderRadius: 6,
    backgroundColor: '#060B08',
  },
  photo: {
    width: wp(40),
    height: wp(40),
    marginVertical: 4,
    borderWidth: 1,
    borderColor: THREAD,
    borderRadius: wp(20),
  },
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  title: {
    fontSize: font(17),
    fontFamily: 'serif',
    color: '#F1EEE0',
  },
  metadata: {
    marginTop: hp(3),
    fontSize: font(14),
    color: '#B4B8AB',
  },
  arrowContainer: {
    width: wp(20),
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: wp(8),
  },
});
