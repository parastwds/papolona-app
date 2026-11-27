/**
 * Every query key in one place, so mutations and invalidations can't drift
 * from the queries they target. Nest keys by resource: invalidating
 * ['users'] also invalidates ['users', 'me'].
 */
export const queryKeys = {
  currentUser: ['users', 'me'] as const,
  probation: ['users', 'me', 'probation'] as const,
  membership: ['membership'] as const,
  // The billing info every payment uses.
  billing: ['users', 'me', 'billing'] as const,
  // Everything the user paid for.
  purchases: ['users', 'me', 'purchases'] as const,
  // Invalidate ['series'] whenever a reading is drawn or judged.
  seriesAll: ['series'] as const,
  seriesActive: ['series', 'active'] as const,
  seriesList: ['series', 'list'] as const,
  seriesOptions: ['series-options'] as const,
  // The collective artwork. Invalidate ['artwork'] after publishing.
  artworkAll: ['artwork'] as const,
  artworkWall: ['artwork', 'wall'] as const,
  artworkTile: (id: string) => ['artwork', 'tile', id] as const,
  memberGallery: (userId: string) => ['artwork', 'member', userId] as const,
  // Direct messages. Invalidate ['dms'] after a request, an answer, a message or a block.
  dmsAll: ['dms'] as const,
  dmInbox: ['dms', 'inbox'] as const,
  dmConversation: (id: string) => ['dms', 'conversation', id] as const,
  dmSearch: (q: string) => ['dms', 'search', q] as const,
  dmBlocked: ['dms', 'blocked'] as const,
  // Member profiles and requests to see them.
  memberProfile: (id: string) => ['members', 'profile', id] as const,
  profileAccessRequests: ['members', 'access-requests'] as const,
  // The marketplace. Invalidate ['market'] after listing, withdrawing or buying.
  marketAll: ['market'] as const,
  marketListings: ['market', 'listings'] as const,
  marketListing: (id: string) => ['market', 'listing', id] as const,
  marketMine: ['market', 'mine'] as const,
  communityMap: ['community', 'map'] as const,
  communityStats: ['community', 'stats'] as const,
  // Changes when a series completes: invalidate with ['series'].
  userSettings: ['users', 'me', 'settings'] as const,
  reminders: ['reminders'] as const,
  questionnaire: ['onboarding', 'questionnaire'] as const,
  clueStatus: ['clue', 'status'] as const,
  // Every clue drawn, with its question (the readings gallery).
  readings: ['clue', 'readings'] as const,
  // Invalidate ['journal', 'calendar'] whenever entries or readings change.
  journalCalendarAll: ['journal', 'calendar'] as const,
  journalCalendar: (month: string) => ['journal', 'calendar', month] as const,
  journalEntries: ['journal', 'entries'] as const,
  // Invalidate ['stats'] whenever readings, ratings or entries change.
  statsAll: ['stats'] as const,
  stats: (unit: string, from: string, to: string) =>
    ['stats', unit, from, to] as const,
  // Invalidate ['journal', 'insights'] whenever entries change.
  journalInsightsAll: ['journal', 'insights'] as const,
  journalInsights: (day: string) => ['journal', 'insights', day] as const,
  // Keyed by local date (YYYY-MM-DD), so a new day means a new artwork.
};
