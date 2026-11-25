import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from './queries';
import { queryKeys } from './queryKeys';
import { deviceTimeZone, updateTimeZone } from './session';

/**
 * Reminder emails are timed in the user's time zone: saves the phone's zone on
 * the account whenever it differs (first use, or after travelling).
 */
export function useSyncTimeZone() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const zone = deviceTimeZone();
  const synced = useRef(false);

  useEffect(() => {
    if (!user.data || synced.current || user.data.profile.timezone === zone) {
      return;
    }
    synced.current = true;
    updateTimeZone(zone)
      .then(updated => queryClient.setQueryData(queryKeys.currentUser, updated))
      .catch(() => {
        synced.current = false;
      });
  }, [user.data, zone, queryClient]);

  return zone;
}
