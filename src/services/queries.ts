import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  QueryKey,
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiRequest } from './api';
import {
  fetchBlockedMembers,
  fetchConversation,
  fetchDmInbox,
  fetchMemberProfile,
  fetchProfileAccessRequests,
  searchMembers,
} from './session';
import { queryKeys } from './queryKeys';
import {
  JournalDayRange,
  fetchClueStatus,
  fetchCurrentUser,
  fetchJournalEntries,
  fetchJournalCalendar,
  fetchJournalInsights,
  fetchActiveSeries,
  fetchMembership,
  fetchBilling,
  fetchPurchases,
  fetchMemberGallery,
  fetchCommunityMap,
  fetchCommunityStats,
  fetchProbation,
  fetchWall,
  fetchListings,
  fetchListing,
  fetchMyListings,
  fetchWallTile,
  fetchSeriesList,
  fetchSeriesOptions,
  fetchReadings,
  fetchStats,
  fetchReminders,
  fetchUserSettings,
  StatsUnit,
} from './session';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const currentUserQuery = queryOptions({
  queryKey: queryKeys.currentUser,
  queryFn: fetchCurrentUser,
  staleTime: 30 * 1000,
});

export type Questionnaire = {
  version: number;
  questions: Array<{
    key: string;
    prompt: string;
    multiple: boolean;
    options: Array<{ key: string; label: string; exclusive: boolean }>;
  }>;
};

export const questionnaireQuery = queryOptions({
  queryKey: queryKeys.questionnaire,
  queryFn: () => apiRequest<Questionnaire>('/onboarding/questionnaire'),
  staleTime: 10 * MINUTE,
});

/**
 * Refetches the given query when the screen regains focus, if it is stale.
 * Tab screens stay mounted, so TanStack's own on-mount refetch doesn't cover
 * switching back to a tab.
 */
export function useRefetchOnScreenFocus(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      // The first focus is the mount, which the query already handles.
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      queryClient.refetchQueries({ queryKey, stale: true, type: 'active' });
    }, [queryClient, queryKey]),
  );
}

export function useCurrentUser() {
  useRefetchOnScreenFocus(currentUserQuery.queryKey);
  return useQuery(currentUserQuery);
}

// Readings toward membership. It only grows when a clue is drawn, and the
// Journal tab invalidates it then, so a long staleTime is fine.
export const probationQuery = queryOptions({
  queryKey: queryKeys.probation,
  queryFn: fetchProbation,
  staleTime: 30 * MINUTE,
});

export function useProbation() {
  useRefetchOnScreenFocus(probationQuery.queryKey);
  return useQuery(probationQuery);
}

// Membership status and whether the user can join now.
export const membershipQuery = queryOptions({
  queryKey: queryKeys.membership,
  queryFn: fetchMembership,
  staleTime: 5 * MINUTE,
});

export function useMembership(enabled = true) {
  useRefetchOnScreenFocus(membershipQuery.queryKey);
  return useQuery({ ...membershipQuery, enabled });
}

// The billing info every payment uses, and the account details to start it with.
export function useBilling() {
  return useQuery({
    queryKey: queryKeys.billing,
    queryFn: fetchBilling,
    staleTime: 30 * MINUTE,
  });
}

// The user's purchases. Always refetched when the screen opens: a purchase can happen anywhere.
export function usePurchases() {
  useRefetchOnScreenFocus(queryKeys.purchases);
  return useQuery({
    queryKey: queryKeys.purchases,
    queryFn: fetchPurchases,
    staleTime: 0,
  });
}

// The series picker: lengths, grids, rarities and rewards, and the publish
// price (fixed on the server).
export function useSeriesOptions() {
  return useQuery({
    queryKey: queryKeys.seriesOptions,
    queryFn: fetchSeriesOptions,
    staleTime: 30 * MINUTE,
  });
}

// The collective artwork, newest first, one page at a time.
export const wallQuery = infiniteQueryOptions({
  queryKey: queryKeys.artworkWall,
  queryFn: ({ pageParam }) => fetchWall(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: lastPage => lastPage.nextBefore ?? undefined,
  // Other members publish to it: keep it fresh.
  staleTime: MINUTE,
});

export function useWall() {
  useRefetchOnScreenFocus(wallQuery.queryKey);
  return useInfiniteQuery(wallQuery);
}

// The marketplace, newest first, one page at a time.
export const marketQuery = infiniteQueryOptions({
  queryKey: queryKeys.marketListings,
  queryFn: ({ pageParam }) => fetchListings(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: lastPage => lastPage.nextBefore ?? undefined,
  // Others list and buy all the time: keep it fresh.
  staleTime: MINUTE,
});

export function useMarket() {
  useRefetchOnScreenFocus(marketQuery.queryKey);
  return useInfiniteQuery(marketQuery);
}

// The user's own listings, open and sold: their sales in the Gallery and on Profile.
export function useMyListings(enabled = true) {
  useRefetchOnScreenFocus(queryKeys.marketMine);
  return useQuery({
    queryKey: queryKeys.marketMine,
    queryFn: fetchMyListings,
    staleTime: MINUTE,
    enabled,
  });
}

// One listing opened. Refetched on focus: it may have sold meanwhile.
export function useListing(id: string) {
  useRefetchOnScreenFocus(queryKeys.marketListing(id));
  return useQuery({
    queryKey: queryKeys.marketListing(id),
    queryFn: () => fetchListing(id),
    staleTime: MINUTE,
  });
}

// One wall tile opened, with what its readings meant. Published series don't change.
export function useWallTile(id: string) {
  return useQuery({
    queryKey: queryKeys.artworkTile(id),
    queryFn: () => fetchWallTile(id),
    staleTime: 30 * MINUTE,
  });
}

// A member's published series.
export function useMemberGallery(userId: string) {
  return useQuery({
    queryKey: queryKeys.memberGallery(userId),
    queryFn: () => fetchMemberGallery(userId),
    staleTime: 5 * MINUTE,
  });
}

// Users per country for the world map. Other people join all the time, but slowly.
export function useCommunityMap() {
  return useQuery({
    queryKey: queryKeys.communityMap,
    queryFn: fetchCommunityMap,
    staleTime: 5 * MINUTE,
  });
}

// The collective's figures on Discover. Everyone adds to them, slowly.
export function useCommunityStats() {
  useRefetchOnScreenFocus(queryKeys.communityStats);
  return useQuery({
    queryKey: queryKeys.communityStats,
    queryFn: fetchCommunityStats,
    staleTime: 5 * MINUTE,
  });
}

// The member's active NFT series. Refetched on focus: its deadline can pass
// while the app is closed, and then the server abandons it.
export function useActiveSeries(enabled = true) {
  useRefetchOnScreenFocus(queryKeys.seriesActive);
  return useQuery({
    queryKey: queryKeys.seriesActive,
    queryFn: fetchActiveSeries,
    staleTime: MINUTE,
    enabled,
  });
}

// Active and completed series, for the Collect tab.
export function useSeriesList(enabled = true) {
  useRefetchOnScreenFocus(queryKeys.seriesList);
  return useQuery({
    queryKey: queryKeys.seriesList,
    queryFn: fetchSeriesList,
    staleTime: MINUTE,
    enabled,
  });
}

// The saved journal, newest first, one page at a time. Entries only change
// through this app, so the cache is updated directly after each change.
export const journalEntriesQuery = infiniteQueryOptions({
  queryKey: queryKeys.journalEntries,
  queryFn: ({ pageParam }) => fetchJournalEntries(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  staleTime: 5 * MINUTE,
});

export function useJournalEntries() {
  useRefetchOnScreenFocus(journalEntriesQuery.queryKey);
  return useInfiniteQuery(journalEntriesQuery);
}

// Today's clue and when the next one is allowed. It only changes when the user
// draws (the Journal tab writes the result into the cache) or as time passes
// (the countdown runs on the device), so a refetch is needed only when stale.
export const clueStatusQuery = queryOptions({
  queryKey: queryKeys.clueStatus,
  queryFn: fetchClueStatus,
  staleTime: 5 * MINUTE,
});

export function useClueStatus() {
  useRefetchOnScreenFocus(clueStatusQuery.queryKey);
  return useQuery(clueStatusQuery);
}

// The user's readings (clues drawn, with their questions), newest first. Only
// a draw adds one, and the Journal tab invalidates them then.
export const readingsQuery = infiniteQueryOptions({
  queryKey: queryKeys.readings,
  queryFn: ({ pageParam }) => fetchReadings(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  staleTime: 30 * MINUTE,
});

export function useReadings() {
  useRefetchOnScreenFocus(readingsQuery.queryKey);
  return useInfiniteQuery(readingsQuery);
}

// Which days of a month (YYYY-MM, local) have entries or readings. The range
// is the month's local start and end, so days line up with the calendar.
export const journalCalendarQuery = (month: string) => {
  const [year, monthIndex] = month.split('-').map(Number);
  const from = new Date(year, monthIndex - 1, 1);
  const to = new Date(year, monthIndex, 1);
  return queryOptions({
    queryKey: queryKeys.journalCalendar(month),
    queryFn: () => fetchJournalCalendar(from.toISOString(), to.toISOString()),
    staleTime: 5 * MINUTE,
  });
};

export function useJournalCalendar(month: string) {
  return useQuery(journalCalendarQuery(month));
}

// Notification settings and the reading reminder time. Only changed in this
// app, which writes the saved settings straight into the cache.
export const userSettingsQuery = queryOptions({
  queryKey: queryKeys.userSettings,
  queryFn: fetchUserSettings,
  staleTime: 30 * MINUTE,
});

export function useUserSettings() {
  return useQuery(userSettingsQuery);
}

// The user's reminders. The dispatcher marks them sent on the server, so they
// refetch when the screen comes into focus.
export const remindersQuery = queryOptions({
  queryKey: queryKeys.reminders,
  queryFn: fetchReminders,
  staleTime: 5 * MINUTE,
});

// The server moves a reminder on (or switches a one-off off) within a minute
// of its time; ask again then, so the list never shows a passed time as next.
const REFRESH_AFTER_DUE_MS = 75 * 1000;

export function useReminders() {
  useRefetchOnScreenFocus(remindersQuery.queryKey);
  const queryClient = useQueryClient();
  const query = useQuery(remindersQuery);
  const nextDue = query.data
    ?.filter(reminder => reminder.active)
    .reduce<number | null>((soonest, reminder) => {
      const at = Date.parse(reminder.remindAt);
      return soonest === null || at < soonest ? at : soonest;
    }, null);
  useEffect(() => {
    if (nextDue == null) return;
    const wait = Math.max(5000, nextDue + REFRESH_AFTER_DUE_MS - Date.now());
    // Timers that long are unreliable; a later screen focus refetches anyway.
    if (wait > 6 * HOUR) return;
    const timer = setTimeout(
      () => queryClient.invalidateQueries({ queryKey: queryKeys.reminders }),
      wait,
    );
    return () => clearTimeout(timer);
  }, [nextDue, queryClient]);
  return query;
}

// Activity stats for the Home graphs. Readings, ratings and notes invalidate
// ['stats'] when they change, so cached ranges only refetch when stale.
export const statsQuery = (query: {
  unit: StatsUnit;
  from?: string;
  to: string;
}) =>
  queryOptions({
    queryKey: queryKeys.stats(query.unit, query.from ?? 'first', query.to),
    queryFn: () => fetchStats(query),
    staleTime: 10 * MINUTE,
    placeholderData: previous => previous,
  });

export function useStats(query: {
  unit: StatsUnit;
  from?: string;
  to: string;
}) {
  return useQuery(statsQuery(query));
}

// A day's AI reading. The server keeps it until that day's entries change,
// and the Journal tab invalidates these queries whenever entries change.
export const journalInsightsQuery = (range: JournalDayRange) =>
  queryOptions({
    queryKey: queryKeys.journalInsights(range.day),
    queryFn: () => fetchJournalInsights(range),
    staleTime: 30 * MINUTE,
  });

// With enabled false, nothing is requested, so the AI is never asked to read the day.
export function useJournalInsights(range: JournalDayRange, enabled = true) {
  return useQuery({ ...journalInsightsQuery(range), enabled });
}


// ── Direct messages and member profiles ─────────────────────────────────────

const SECOND = 1000;

// The Messages tab, kept fresh while the app is open (no push yet).
export function useDmInbox() {
  useRefetchOnScreenFocus(queryKeys.dmInbox);
  return useQuery({
    queryKey: queryKeys.dmInbox,
    queryFn: fetchDmInbox,
    // Fresh whenever the tab is opened, and every 20 seconds while it is.
    staleTime: 0,
    refetchInterval: 20 * SECOND,
  });
}

// One conversation, polled while it is open so new messages appear.
export function useConversation(id: string) {
  return useQuery({
    queryKey: queryKeys.dmConversation(id),
    queryFn: () => fetchConversation(id),
    refetchInterval: 4 * SECOND,
  });
}

// Members whose name contains `q` (two letters or more).
export function useMemberSearch(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: queryKeys.dmSearch(query),
    queryFn: () => searchMembers(query),
    enabled: query.length >= 2,
    staleTime: 30 * SECOND,
  });
}

export function useBlockedMembers() {
  return useQuery({ queryKey: queryKeys.dmBlocked, queryFn: fetchBlockedMembers });
}

export function useMemberProfile(id: string) {
  useRefetchOnScreenFocus(queryKeys.memberProfile(id));
  return useQuery({
    queryKey: queryKeys.memberProfile(id),
    queryFn: () => fetchMemberProfile(id),
    // Access and messages change from the other side: fresh on every visit.
    staleTime: 0,
  });
}

// Requests to see the user's readings and NFTs, for their notifications.
export function useProfileAccessRequests() {
  useRefetchOnScreenFocus(queryKeys.profileAccessRequests);
  return useQuery({
    queryKey: queryKeys.profileAccessRequests,
    queryFn: fetchProfileAccessRequests,
    staleTime: 0,
    refetchInterval: 60 * SECOND,
  });
}
