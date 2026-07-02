import { afterAll, beforeAll } from 'vitest';
import {
  cleanupGoogleCalendarLiveHarness,
  createGoogleCalendarLiveHarness,
  type GoogleCalendarLiveHarness,
  requireGoogleCalendarScopes
} from '../test-helpers/live-fixtures';

export let setupGoogleCalendarLiveHarness = () => {
  let harness: GoogleCalendarLiveHarness;
  let missingScopeMessage: string | null = null;

  beforeAll(async () => {
    harness = await createGoogleCalendarLiveHarness();
    missingScopeMessage = requireGoogleCalendarScopes(harness);
  });

  afterAll(async () => {
    let cleanupErrors = await cleanupGoogleCalendarLiveHarness(harness);

    if (cleanupErrors.length > 0) {
      throw new Error(
        `Google Calendar live cleanup failed for ${cleanupErrors.length} resource(s).`
      );
    }
  });

  return {
    getHarness() {
      return harness;
    },
    skipIfMissingScopes(context: { skip: (reason?: string) => never }) {
      if (missingScopeMessage) {
        context.skip(missingScopeMessage);
      }
    }
  };
};
