import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Mic, PenLine, Sparkles, Trash2 } from 'lucide-react-native';

import { Image } from 'expo-image';

import PhotoViewer from '@/components/PhotoViewer';
import { font, hp, wp } from '@/utils/responsive';
import { CLUE_FONT } from '@/theme/fonts';
import type { JournalEntry } from '@/services/session';
import { isPendingEntry } from '../journalCache';
import { formatTime } from '../journalDays';

interface JournalEntryCardProps {
  entry: JournalEntry;
  onDelete: (entry: JournalEntry) => void;
}

/** One written or spoken entry, its photos, the clue it belongs to and when it was made. */
const JournalEntryCard = ({ entry, onDelete }: JournalEntryCardProps) => {
  const Icon = entry.source === 'voice' ? Mic : PenLine;
  const pending = isPendingEntry(entry);
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);
  const photos = entry.photos ?? [];
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.tag}>
          <Icon size={15} color="#A1BE94" strokeWidth={1.7} />
          <Text style={styles.tagText}>
            {entry.source === 'voice' ? 'Spoken' : 'Written'}
          </Text>
        </View>
        {entry.clue ? (
          <View style={styles.tag}>
            <Sparkles size={14} color={COLORS.gold} strokeWidth={1.7} />
            <Text style={[styles.tagText, styles.clueTagText]}>
              {entry.clue.clue}
            </Text>
          </View>
        ) : null}
        <Text style={styles.time} numberOfLines={1}>
          {pending ? 'Saving…' : formatTime(new Date(entry.createdAt))}
        </Text>
        {pending ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete entry"
            onPress={() => onDelete(entry)}
            android_ripple={DELETE_RIPPLE}
            style={styles.deleteButton}
          >
            <Trash2 size={18} color={COLORS.danger} strokeWidth={1.7} />
          </Pressable>
        )}
      </View>
      {entry.text ? <Text style={styles.text}>{entry.text}</Text> : null}
      {photos.length > 0 && (
        <View style={styles.photos}>
          {photos.map((photo, index) => (
            <Pressable
              key={photo.publicId || photo.url}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo ${index + 1} of ${photos.length}`}
              onPress={() => setOpenPhoto(photo.url)}
            >
              <Image
                source={{ uri: photo.url }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
                style={styles.photo}
              />
            </Pressable>
          ))}
        </View>
      )}
      {openPhoto && (
        <PhotoViewer
          uri={openPhoto}
          title="Journal photo"
          visible
          onClose={() => setOpenPhoto(null)}
        />
      )}
    </View>
  );
};

export default JournalEntryCard;

const COLORS = {
  gold: '#E8D58A',
  danger: '#E2A09A',
};

const DELETE_RIPPLE = {
  color: 'rgba(226, 160, 154, 0.18)',
  borderless: true,
  radius: 22,
};

const styles = StyleSheet.create({
  // A quiet box, as elsewhere: a dark wash and one thin edge.
  card: {
    marginBottom: hp(12),
    padding: wp(16),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 16,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
  },
  // How it was made and which clue it belongs to, as plain words with an icon.
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: {
    color: '#B4B8AB',
    fontSize: font(13),
  },
  time: {
    flex: 1,
    color: '#979C8F',
    fontSize: font(13),
    textAlign: 'right',
  },
  clueTagText: {
    color: COLORS.gold,
    fontFamily: CLUE_FONT,
    letterSpacing: 1.5,
  },
  // A 44 touch area; pulled in so the icon lines up with the box's edge.
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -10,
    marginRight: -12,
  },
  text: {
    marginTop: hp(10),
    color: '#F1EEE0',
    fontSize: font(16),
    lineHeight: font(24),
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(8),
    marginTop: hp(12),
  },
  photo: {
    width: wp(76),
    height: wp(76),
    borderRadius: 10,
    backgroundColor: 'rgba(217, 199, 126, 0.08)',
  },
});
