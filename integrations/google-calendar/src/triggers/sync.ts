import { createHash } from 'node:crypto';
import { isServiceError } from '@lowerdeck/error';
import {
  assertNewPageToken,
  createApiServiceError,
  getApiErrorStatus,
  parseWithServiceError
} from 'slates';
import type { GoogleCalendarClient } from '../lib/client';
import { calendarEventSchema } from './event-schemas';

export const CALENDAR_SYNC_MAX_PAGES = 100;
// A drain stops at the first page boundary past this; pages hold at most 2,500 changes.
export const CALENDAR_SYNC_BATCH_EVENTS = 2500;
const SYNC_BUDGET_MS = 45_000;
const BUDGET_EXCEEDED = 'google_calendar_sync_budget_exceeded';

// `pageToken` continues the sync from `syncToken`, or an unfinished baseline when there is none.
type CalendarCursor = { syncToken?: string; pageToken?: string };
type Warn = (message: { message: string; reason: string; calendarId: string }) => void;
type CalendarChange = {
  payload: {
    kind: 'event_changed' | 'event_cancelled';
    calendarId: string;
    eventId: string;
    revisionId: string;
    event: ReturnType<typeof calendarEventSchema.parse>;
  };
  idempotencyKey: string;
};

const upstreamStatus = (error: unknown) =>
  Number(isServiceError(error) ? error.data.upstreamStatus : getApiErrorStatus(error));

// Full and incremental sync must share parameters; series are not expanded (unbounded).
// Google issues the next sync token on the last page, so a resumable drain keeps its
// starting sync token plus the next page token.
export const drainCalendarChanges = async (
  client: GoogleCalendarClient,
  calendarId: string,
  from: CalendarCursor = {},
  resumable = false
): Promise<{ events: CalendarChange[] } & CalendarCursor> => {
  const started = Date.now();
  const syncToken = from.syncToken;
  const seenPages = new Set<string>(from.pageToken ? [from.pageToken] : []);
  const events: CalendarChange[] = [];
  let pageToken = from.pageToken;
  for (let pages = 0; ; pages++) {
    if (pages >= CALENDAR_SYNC_MAX_PAGES || Date.now() - started >= SYNC_BUDGET_MS) {
      if (resumable && pageToken) return { events, syncToken, pageToken };
      // The re-read after a rejected page cannot resume: its cursor stays put.
      throw createApiServiceError(
        'Calendar synchronization exceeded the processing budget. No synchronization cursor was advanced.',
        { reason: BUDGET_EXCEEDED }
      );
    }
    const page = await client.listEvents({
      calendarId,
      syncToken,
      pageToken,
      maxResults: 2500,
      singleEvents: false,
      showDeleted: true
    });
    for (const raw of page.items ?? []) {
      if (!syncToken) continue; // Initial and expired-token baselines are silent.
      const event = parseWithServiceError(
        calendarEventSchema,
        raw,
        'Google Calendar returned an event without a valid identity.'
      );
      const kind = event.status === 'cancelled' ? 'event_cancelled' : 'event_changed';
      // Fallback key for sparse tombstones; not iCalUID, which recurring instances share.
      const revision = event.etag ?? event.updated ?? `${kind}:${syncToken}`;
      const revisionId = createHash('sha256')
        .update(JSON.stringify([calendarId, event.id, revision]))
        .digest('hex');
      events.push({
        payload: { kind, calendarId, eventId: event.id, revisionId, event },
        idempotencyKey: revisionId
      });
    }
    pageToken = page.nextPageToken;
    if (!pageToken) {
      if (!page.nextSyncToken)
        throw createApiServiceError(
          'Google Calendar did not return a completed synchronization token.'
        );
      return { events, syncToken: page.nextSyncToken };
    }
    assertNewPageToken(seenPages, pageToken, () =>
      createApiServiceError('Google Calendar returned a repeated synchronization page token.')
    );
    if (resumable && syncToken && events.length >= CALENDAR_SYNC_BATCH_EVENTS)
      return { events, syncToken, pageToken };
  }
};

export const syncCalendar = async (
  client: GoogleCalendarClient,
  calendarId: string,
  cursor: CalendarCursor,
  warn: Warn
) => {
  // A large baseline spans calls; Google keeps entries changed while a full sync pages.
  const baseline = async (from: { pageToken?: string } = {}) => {
    const result = await drainCalendarChanges(client, calendarId, from, true);
    if (!result.syncToken)
      warn({
        message:
          'The calendar is too large to synchronize within one processing budget. Synchronization continues on the next notification or scheduled check; no events are delivered for this calendar until it completes.',
        reason: 'google_calendar_baseline_unfinished',
        calendarId
      });
    return result;
  };
  let resumable = true;
  if (cursor.pageToken) {
    try {
      return cursor.syncToken
        ? await drainCalendarChanges(client, calendarId, cursor, true)
        : await baseline(cursor);
    } catch (error) {
      const status = upstreamStatus(error);
      if (status !== 400 && status !== 410) throw error;
      warn({
        message: cursor.syncToken
          ? 'Google Calendar rejected the saved page position. Reading the pending changes again from the last completed synchronization.'
          : 'Google Calendar rejected the saved page position. Synchronizing the calendar again from scratch without announcing existing events.',
        reason: 'google_calendar_page_token_rejected',
        calendarId
      });
      // Reading in batches again could stall on the same rejection every time.
      resumable = false;
    }
  }
  if (!cursor.syncToken) return baseline();
  try {
    return await drainCalendarChanges(
      client,
      calendarId,
      { syncToken: cursor.syncToken },
      resumable
    );
  } catch (error) {
    // The unbatched re-read cannot resume; over budget it would fail on every later call.
    const unfinished =
      !resumable && isServiceError(error) && error.data.reason === BUDGET_EXCEEDED;
    if (!unfinished && upstreamStatus(error) !== 410) throw error;
    warn(
      unfinished
        ? {
            message:
              'The pending Google Calendar changes could not be read again within the processing budget. Synchronizing the calendar again from scratch without announcing existing events; the pending changes are not delivered.',
            reason: 'google_calendar_pending_changes_dropped',
            calendarId
          }
        : {
            message:
              'Google Calendar expired the synchronization token. Synchronizing the calendar again from scratch without announcing existing events; changes made between the expired token and this resynchronization are not delivered.',
            reason: 'google_calendar_sync_token_expired',
            calendarId
          }
    );
    return baseline();
  }
};
