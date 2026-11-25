import { Alert } from 'react-native';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '@/services/api';
import {
  JournalEntry,
  JournalPage,
  deleteJournalEntry,
} from '@/services/session';
import { queryKeys } from '@/services/queryKeys';

// Entries shown before the server confirms them carry this id prefix.
export const PENDING_ID_PREFIX = 'pending-';

export const isPendingEntry = (entry: JournalEntry) =>
  entry.id.startsWith(PENDING_ID_PREFIX);

/** Edits to the cached journal shared by the Journal tab and a day's thread. */
export function useJournalCache() {
  const queryClient = useQueryClient();

  // Edits the cached journal pages in place; index 0 is the newest page.
  const editEntries = (
    edit: (pageEntries: JournalEntry[], pageIndex: number) => JournalEntry[],
  ) =>
    queryClient.setQueryData<InfiniteData<JournalPage, string | undefined>>(
      queryKeys.journalEntries,
      data =>
        data && {
          ...data,
          pages: data.pages.map((page, index) => ({
            ...page,
            entries: edit(page.entries, index),
          })),
        },
    );

  const refetchJournal = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.journalEntries });

  // A day's AI reading depends on its entries; ask again after any change.
  // Note counts in the Home stats change with it too.
  const invalidateInsights = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.journalInsightsAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.statsAll });
  };

  /** Asks, then deletes the entry for good. `onError` gets the message to show. */
  const confirmDelete = (
    entry: JournalEntry,
    onError: (message: string) => void,
  ) => {
    Alert.alert(
      'Delete entry',
      'This entry will be removed from your journal for good.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            editEntries(pageEntries =>
              pageEntries.filter(item => item.id !== entry.id),
            );
            try {
              await deleteJournalEntry(entry.id);
              invalidateInsights();
            } catch (error) {
              refetchJournal();
              onError(getErrorMessage(error, 'Could not delete this entry.'));
            }
          },
        },
      ],
    );
  };

  return { editEntries, refetchJournal, invalidateInsights, confirmDelete };
}
