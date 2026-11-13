import { verifyChannelNotification } from '@slates/google-push-channels';
import {
  createApiServiceError,
  parseWithServiceError,
  SlateTrigger,
  skipWebhook,
  triggerGroup
} from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarTriggerScopes } from '../scopes';
import { spec } from '../spec';
import {
  calendarChangeSchema,
  calendarRegistrationSchema,
  calendarStateSchema
} from './event-schemas';
import { calendarAutoRegistration, currentCalendarOwner } from './registration';
import { syncCalendar } from './sync';

export const calendarEvents = triggerGroup(spec, {
  key: 'calendar_events',
  name: 'Calendar events',
  description: 'New or changed events and cancellations on calendars you can read.',
  eventSchema: z
    .object({
      kind: z.enum(['calendar_sync', 'event_changed', 'event_cancelled']),
      calendarId: z.string()
    })
    .passthrough()
})
  .webhook({
    autoRegistration: calendarAutoRegistration,
    reconcileIntervalSeconds: 900,
    process: async ctx => {
      const registration = calendarRegistrationSchema.safeParse(
        ctx.input.webhookRegistrationPayload
      );
      if (!registration.success)
        return skipWebhook('google_calendar_webhook_registration_invalid', { status: 500 });
      // Push has an empty body and only a shared token; never parse event JSON or trust delivery order.
      const verified = await verifyChannelNotification({
        integration: 'google_calendar',
        request: ctx.input.request,
        channels: [registration.data.channel, ...registration.data.previousChannels],
        emptyBody: true
      });
      if (!verified.ok) return verified.skip;
      const { channel, messageNumber: message, resourceState: state } = verified;
      if (state === 'sync') return { events: [] };
      if (state !== 'exists' && state !== 'not_exists')
        return skipWebhook('google_calendar_webhook_state_unsupported', { status: 200 });
      return {
        events: [
          {
            payload: { kind: 'calendar_sync', calendarId: registration.data.calendarId },
            matchers: [],
            idempotencyKey: `${channel.id}:${message}`
          }
        ]
      };
    },
    expandWebhook: async ctx => {
      const saved = parseWithServiceError(
        calendarRegistrationSchema,
        ctx.input.webhookRegistrationPayload,
        'The saved calendar channel is invalid.'
      );
      const wakeup = z
        .object({ kind: z.literal('calendar_sync'), calendarId: z.string() })
        .safeParse(ctx.input.payload);
      if (
        ctx.input.payload !== null &&
        (!wakeup.success || wakeup.data.calendarId !== saved.calendarId)
      ) {
        throw createApiServiceError('The calendar notification identity does not match.');
      }
      const client = new GoogleCalendarClient(ctx.auth.token);
      if ((await currentCalendarOwner(client)) !== saved.ownerId)
        throw createApiServiceError(
          'The calendar channel belongs to a different Google account.'
        );
      const state = parseWithServiceError(
        calendarStateSchema,
        ctx.input.state ?? { version: 1, ownerId: saved.ownerId, calendars: {} },
        'The saved calendar synchronization state is invalid.'
      );
      if (state.ownerId !== saved.ownerId)
        throw createApiServiceError(
          'The calendar synchronization state belongs to a different Google account.'
        );
      const result = await syncCalendar(
        client,
        saved.calendarId,
        state.calendars[saved.calendarId] ?? {
          syncToken: saved.initialSyncToken,
          pageToken: saved.initialPageToken
        },
        message => ctx.warn(message)
      );
      return {
        events: result.events,
        updatedState: {
          ...state,
          calendars: {
            ...state.calendars,
            [saved.calendarId]: {
              ...(result.syncToken ? { syncToken: result.syncToken } : {}),
              ...(result.pageToken ? { pageToken: result.pageToken } : {})
            }
          }
        }
      };
    }
  })
  .routingMatchers(async () => [])
  .build();

const changeTrigger = (
  kind: 'event_changed' | 'event_cancelled',
  name: string,
  description: string
) =>
  SlateTrigger.create(spec, {
    key: kind,
    name,
    description
  })
    .triggerGroup(calendarEvents)
    .input(calendarChangeSchema)
    .output(calendarChangeSchema)
    .scopes(googleCalendarTriggerScopes)
    .matches(payload => {
      const parsed = calendarChangeSchema.safeParse(payload);
      return parsed.success && parsed.data.kind === kind;
    })
    .map(async ctx => ({
      type: kind === 'event_changed' ? 'calendar.event.changed' : 'calendar.event.cancelled',
      id: ctx.input.revisionId,
      output: ctx.input
    }))
    .build();

export const eventChanged = changeTrigger(
  'event_changed',
  'Event changed',
  'An event was added or changed on the watched calendar.'
);
export const eventCancelled = changeTrigger(
  'event_cancelled',
  'Event cancelled',
  'An event was cancelled or deleted on the watched calendar; other attendees may retain their own copies.'
);
