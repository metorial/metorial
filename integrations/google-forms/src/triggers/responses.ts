import { createHash } from 'node:crypto';
import {
  assertNewPageToken,
  createApiServiceError,
  getUpstreamErrorStatus,
  parseWithServiceError
} from 'slates';
import { z } from 'zod';
import type { GoogleFormsClient } from '../lib/client';
import {
  type FormRegistration,
  type FormState,
  formStateSchema,
  responseSchema,
  timestampNanos
} from './event-schemas';

const PAGE_SIZE = 1000;
// One call stops at the first page boundary past any of these limits.
export const FORM_SCAN_MAX_EVENTS = 2000;
export const FORM_SCAN_MAX_PAGES = 20;
export const FORM_SCAN_BUDGET_MS = 30_000;
const FORM_SCAN_OVERLAP_MS = 60 * 60 * 1000;
export const FORM_SCAN_MAX_RESTARTS = 3;

type FormEntry = FormState['forms'][string];
type Scan = Omit<NonNullable<FormEntry['scan']>, 'pageToken'> & { pageToken?: string };

const pageSchema = z.object({
  responses: z.array(responseSchema).default([]),
  nextPageToken: z.string().min(1).optional()
});

const toMillis = (value: string) => Number(timestampNanos(value) / 1000000n);

const windowStart = (activatedAt: string, cursor: string) => {
  const overlapStart = toMillis(cursor) - FORM_SCAN_OVERLAP_MS;
  return overlapStart > toMillis(activatedAt)
    ? new Date(overlapStart).toISOString()
    : activatedAt;
};

export const reconcileFormResponses = async (
  client: Pick<GoogleFormsClient, 'listResponses'>,
  saved: FormRegistration,
  inputState: unknown
) => {
  const state = parseWithServiceError(
    formStateSchema,
    inputState ?? { version: 1, ownerId: saved.ownerId, forms: {} },
    'The saved form response state is invalid.'
  );
  if (state.ownerId !== saved.ownerId)
    throw createApiServiceError(
      'The form response state belongs to a different Google account.'
    );
  const previous = state.forms[saved.formId];
  // Re-enabling a new watch establishes a new baseline; renewing preserves activatedAt.
  const entry: FormEntry =
    previous?.activatedAt === saved.activatedAt
      ? previous
      : { activatedAt: saved.activatedAt, cursor: saved.activatedAt, recentResponses: {} };
  const recent = new Map(Object.entries(entry.recentResponses));
  const started = Date.now();
  const beginScan = (restarts: number): Scan => ({
    since: windowStart(saved.activatedAt, entry.cursor),
    startedAt: new Date(started).toISOString(),
    highWater: entry.cursor,
    restarts
  });
  let scan: Scan = entry.scan ? { ...entry.scan } : beginScan(0);
  const fetchPage = () =>
    client.listResponses(saved.formId, {
      filter: `timestamp >= ${scan.since}`,
      pageSize: PAGE_SIZE,
      pageToken: scan.pageToken
    });

  let fetched: unknown;
  try {
    fetched = await fetchPage();
  } catch (error) {
    const status = getUpstreamErrorStatus(error);
    const refused = status && status < 500 && ![401, 403, 429].includes(status);
    if (!entry.scan || !refused) throw error;
    // The saved page token is the only part of this request a fresh read would not send, so
    // Google no longer accepts it: read the same window again. Responses already reported
    // are recognised, so only the unread ones produce events.
    scan = beginScan(entry.scan.restarts + 1);
    fetched = await fetchPage();
  }

  const activated = timestampNanos(saved.activatedAt);
  const events: { payload: object; idempotencyKey: string }[] = [];
  const tokens = new Set(scan.pageToken ? [scan.pageToken] : []);
  let complete = false;
  for (let page = 1; ; page++) {
    const listed = parseWithServiceError(
      pageSchema,
      fetched,
      'Google Forms returned an invalid response page. Progress was not advanced.'
    );
    const since = timestampNanos(scan.since);
    const scanStarted = timestampNanos(scan.startedAt);
    for (const item of listed.responses) {
      if (item.formId && item.formId !== saved.formId)
        throw createApiServiceError('Google Forms returned a response for another form.');
      const created = timestampNanos(item.createTime);
      const submitted = timestampNanos(item.lastSubmittedTime);
      if (submitted < created)
        throw createApiServiceError('Google Forms returned response timestamps out of order.');
      if (submitted <= scanStarted && submitted > timestampNanos(scan.highWater))
        scan.highWater = item.lastSubmittedTime;
      // A first submission before the window was reported by an earlier scan; it is only
      // listed again because it was edited.
      if (created < activated || created < since || recent.has(item.responseId)) continue;
      recent.set(item.responseId, item.createTime);
      const eventId = createHash('sha256')
        .update(JSON.stringify([saved.ownerId, saved.formId, item.responseId]))
        .digest('hex');
      events.push({
        payload: { ...item, kind: 'new_response', formId: saved.formId, eventId },
        idempotencyKey: eventId
      });
    }
    if (!listed.nextPageToken) {
      complete = true;
      break;
    }
    assertNewPageToken(tokens, listed.nextPageToken, () =>
      createApiServiceError(
        'Google Forms repeated a response page token; progress was not advanced.'
      )
    );
    scan.pageToken = listed.nextPageToken;
    if (
      events.length >= FORM_SCAN_MAX_EVENTS ||
      page >= FORM_SCAN_MAX_PAGES ||
      Date.now() - started >= FORM_SCAN_BUDGET_MS
    )
      break;
    fetched = await fetchPage();
  }

  // Restarts only count while they find nothing new, which means the window cannot be read
  // to its end in one call and its position cannot be carried to the next.
  if (events.length) scan.restarts = 0;
  if (!complete && scan.restarts > FORM_SCAN_MAX_RESTARTS)
    throw createApiServiceError(
      'Google Forms keeps rejecting the saved position in this form and its recent responses do not fit one synchronization. Progress was not advanced.'
    );

  // The cursor only moves once every page of the window has been read, because the
  // listing order is not documented and an unread page may hold an earlier response.
  const cursor = complete ? scan.highWater : entry.cursor;
  const keepFrom = timestampNanos(windowStart(saved.activatedAt, cursor));
  const recentResponses = Object.fromEntries(
    [...recent].filter(([, createTime]) => !complete || timestampNanos(createTime) >= keepFrom)
  );
  const updatedState: FormState = {
    ...state,
    forms: {
      ...state.forms,
      [saved.formId]: {
        activatedAt: saved.activatedAt,
        cursor,
        recentResponses,
        ...(!complete && scan.pageToken
          ? { scan: { ...scan, pageToken: scan.pageToken } }
          : {})
      }
    }
  };
  return { events, updatedState };
};
