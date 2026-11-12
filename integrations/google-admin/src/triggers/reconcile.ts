import { createHash } from 'node:crypto';
import {
  assertNewPageToken,
  createApiServiceError,
  getUpstreamErrorStatus,
  parseWithServiceError
} from 'slates';
import type { Client } from '../lib/client';
import {
  type AdminRegistration,
  activityPageSchema,
  activityRecordSchema,
  auditEventSchema,
  lifecycleNameSchema,
  lifecycleNames,
  stateSchema
} from './event-schemas';

export const AUDIT_OVERLAP_MS = 24 * 60 * 60 * 1000;
// One call stops at the first page boundary past any of these; the rest
// continues from the saved position.
export const AUDIT_PAGES_PER_CALL = 100;
export const AUDIT_BATCH_EVENTS = 2500;
const AUDIT_BUDGET_MS = 45_000;
export const AUDIT_SEEN_MAX = 10_000;
export const AUDIT_CLOCK_SKEW_MS = 5 * 60 * 1000;

type Warn = (message: {
  message: string;
  reason: string;
  activityTime?: string;
  activityId?: string;
  eventName?: string;
}) => void;

function activityReference(record: unknown) {
  const id = (record as { id?: { time?: unknown; uniqueQualifier?: unknown } } | null)?.id;
  return {
    activityTime: typeof id?.time === 'string' ? id.time : undefined,
    activityId: typeof id?.uniqueQualifier === 'string' ? id.uniqueQualifier : undefined
  };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export async function reconcileAdminActivities(
  client: Client,
  saved: AdminRegistration,
  previous: unknown,
  warn: Warn
) {
  const state = parseWithServiceError(
    stateSchema,
    previous ?? {
      version: 1,
      customerId: saved.customerId,
      ownerId: saved.ownerId,
      watermark: saved.startedAt,
      seen: {}
    },
    'The administrator audit checkpoint is invalid.'
  );
  if (state.customerId !== saved.customerId || state.ownerId !== saved.ownerId)
    throw createApiServiceError(
      'The administrator audit checkpoint belongs to a different account or customer.'
    );
  const now = Date.now();
  // Another worker's clock can run slightly ahead of this one: a time a little
  // in the future is read as now, while a larger gap means corrupt state.
  const settled = (value: string) => {
    const time = Date.parse(value);
    if (time > now + AUDIT_CLOCK_SKEW_MS)
      throw createApiServiceError('The administrator audit checkpoint is in the future.');
    return Math.min(time, now);
  };
  // A read that ran out of budget continues its own window before a newer one starts.
  const resumed = state.pending;
  const end = resumed ? settled(resumed.end) : now;
  const start = resumed
    ? settled(resumed.start)
    : Math.max(settled(saved.startedAt), settled(state.watermark) - AUDIT_OVERLAP_MS);
  // Google retains audit records for 180 days. Never silently jump a checkpoint
  // beyond that retention window and claim the missing lifecycle history was read.
  if (start < now - 180 * AUDIT_OVERLAP_MS)
    throw createApiServiceError(
      'The administrator audit checkpoint is older than Google audit retention. Reconnect to establish a new baseline.'
    );
  const events: { payload: ReturnType<typeof lifecyclePayload>; idempotencyKey: string }[] =
    [];
  const seen = { ...state.seen };
  let pagesRead = 0;
  let pending: typeof resumed;
  // A new subscription starts at connection time without emitting historical users.
  if (start < end) {
    const names = lifecycleNames.slice(
      resumed ? lifecycleNames.indexOf(resumed.eventName) : 0
    );
    read: for (const eventName of names) {
      let pageToken = eventName === resumed?.eventName ? resumed.pageToken : undefined;
      const pages = new Set<string>(pageToken ? [pageToken] : []);
      for (;;) {
        if (
          pagesRead >= AUDIT_PAGES_PER_CALL ||
          events.length >= AUDIT_BATCH_EVENTS ||
          Date.now() - now >= AUDIT_BUDGET_MS
        ) {
          pending = {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            eventName,
            pageToken
          };
          break read;
        }
        pagesRead++;
        let response: unknown;
        try {
          response = await client.listActivities({
            userKey: 'all',
            applicationName: 'admin',
            customerId: saved.customerId,
            eventName,
            startTime: new Date(start).toISOString(),
            endTime: new Date(end).toISOString(),
            maxResults: 1000,
            pageToken
          });
        } catch (error) {
          const status = getUpstreamErrorStatus(error);
          if (
            !pageToken ||
            pageToken !== resumed?.pageToken ||
            (status !== 400 && status !== 410)
          )
            throw error;
          warn({
            message:
              'Google rejected the saved administrator audit page position. Reading this event name again from its first page.',
            reason: 'google_admin_audit_page_token_rejected',
            eventName
          });
          pageToken = undefined;
          pages.clear();
          continue;
        }
        const result = parseWithServiceError(
          activityPageSchema,
          response,
          'Google returned an invalid administrator audit activity page.'
        );
        for (const item of result.items) {
          // A record that cannot be read stays inside every later overlap window,
          // so failing here would stall the checkpoint for good.
          const record = activityRecordSchema.safeParse(item);
          if (!record.success) {
            warn({
              message: 'Skipped a malformed administrator audit record.',
              reason: 'google_admin_audit_record_invalid',
              ...activityReference(item)
            });
            continue;
          }
          const activity = record.data;
          if (activity.id.customerId !== saved.customerId) {
            warn({
              message:
                'Skipped an administrator audit record that belongs to another Workspace customer.',
              reason: 'google_admin_audit_record_foreign_customer',
              ...activityReference(activity)
            });
            continue;
          }
          const occurred = Date.parse(activity.id.time);
          if (occurred < start || occurred > end) continue;
          const reference = activityReference(activity);
          const occurrences = new Map<string, number>();
          for (const element of activity.events) {
            const audited = auditEventSchema.safeParse(element);
            if (!audited.success) {
              warn({
                message: 'Skipped a malformed event in an administrator audit record.',
                reason: 'google_admin_audit_event_invalid',
                ...reference
              });
              continue;
            }
            const event = audited.data;
            const name = lifecycleNameSchema.safeParse(event.name);
            if (!name.success || event.type !== 'USER_SETTINGS') continue;
            const status = event.status?.eventStatus;
            if (status && status !== 'SUCCEEDED' && status !== 'SUCCEEDED_WITH_WARNINGS')
              continue;
            const subjects = event.parameters.filter(
              parameter => parameter.name === 'USER_EMAIL'
            );
            const userEmail = subjects.length === 1 ? subjects[0]?.value : undefined;
            if (!userEmail) {
              warn({
                message:
                  'Skipped a user lifecycle audit event that does not name exactly one user.',
                reason: 'google_admin_audit_subject_ambiguous',
                ...reference,
                eventName: name.data
              });
              continue;
            }
            const fingerprint = createHash('sha256')
              .update(
                canonical({
                  ...event,
                  parameters: [...event.parameters].sort((a, b) =>
                    canonical(a).localeCompare(canonical(b))
                  )
                })
              )
              .digest('hex');
            const occurrence = occurrences.get(fingerprint) ?? 0;
            occurrences.set(fingerprint, occurrence + 1);
            const eventId = createHash('sha256')
              .update(
                JSON.stringify([
                  activity.id.customerId,
                  activity.id.applicationName,
                  activity.id.time,
                  activity.id.uniqueQualifier,
                  fingerprint,
                  occurrence
                ])
              )
              .digest('hex');
            if (Object.hasOwn(seen, eventId)) continue;
            seen[eventId] = occurred;
            events.push({
              payload: lifecyclePayload(
                eventId,
                saved.customerId,
                name.data,
                activity.id.time,
                userEmail,
                activity.actor
              ),
              idempotencyKey: eventId
            });
          }
        }
        if (!result.nextPageToken) break;
        assertNewPageToken(pages, result.nextPageToken, () =>
          createApiServiceError('Google repeated an administrator audit page token.')
        );
        pageToken = result.nextPageToken;
      }
    }
  }
  if (pending)
    warn({
      message:
        'The administrator audit records were not all read within the processing budget. Reading continues from the saved position on the next notification or scheduled check.',
      reason: 'google_admin_audit_budget_exceeded',
      eventName: pending.eventName
    });
  events.sort(
    (a, b) =>
      a.payload.occurredAt.localeCompare(b.payload.occurredAt) ||
      a.idempotencyKey.localeCompare(b.idempotencyKey)
  );
  // An unfinished window can still be read again from its start.
  const keepFrom = pending ? Math.min(start, end - AUDIT_OVERLAP_MS) : end - AUDIT_OVERLAP_MS;
  const kept = Object.entries(seen).filter(([, occurred]) => occurred >= keepFrom);
  // Past the cap the oldest identities go first: they leave the overlap window
  // soonest. A repeat of one is dropped only while the delivery deduplication
  // window still holds its idempotency key.
  if (kept.length > AUDIT_SEEN_MAX) {
    kept.sort(([, a], [, b]) => b - a);
    kept.length = AUDIT_SEEN_MAX;
  }
  const { pending: _resumed, ...checkpoint } = state;
  return {
    events,
    updatedState: {
      ...checkpoint,
      watermark: pending ? state.watermark : new Date(end).toISOString(),
      seen: Object.fromEntries(kept),
      ...(pending ? { pending } : {})
    }
  };
}

function lifecyclePayload(
  eventId: string,
  customerId: string,
  eventName: (typeof lifecycleNames)[number],
  occurredAt: string,
  userEmail: string,
  actor?: { email?: string; profileId?: string }
) {
  return {
    kind: 'admin_user_lifecycle' as const,
    eventId,
    customerId,
    eventName,
    occurredAt,
    userEmail,
    actorEmail: actor?.email,
    actorProfileId: actor?.profileId
  };
}
