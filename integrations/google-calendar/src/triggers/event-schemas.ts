import { googleWatchChannelSchema } from '@slates/google-push-channels';
import { z } from 'zod';

const dateTimeSchema = z.object({
  date: z.string().optional(),
  dateTime: z.string().optional(),
  timeZone: z.string().optional()
});

// Deleted events may carry only id (exceptions add recurringEventId and originalStartTime).
export const calendarEventSchema = z
  .object({
    id: z.string().min(1),
    etag: z.string().optional(),
    status: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    start: dateTimeSchema.optional(),
    end: dateTimeSchema.optional(),
    recurrence: z.array(z.string()).optional(),
    recurringEventId: z.string().optional(),
    originalStartTime: dateTimeSchema.optional(),
    iCalUID: z.string().optional(),
    sequence: z.number().optional(),
    htmlLink: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    attendees: z
      .array(
        z
          .object({
            email: z.string().optional(),
            displayName: z.string().optional(),
            responseStatus: z.string().optional(),
            self: z.boolean().optional()
          })
          .passthrough()
      )
      .optional(),
    organizer: z
      .object({ email: z.string().optional(), displayName: z.string().optional() })
      .passthrough()
      .optional()
  })
  .passthrough();

export const calendarChangeSchema = z.object({
  kind: z.enum(['event_changed', 'event_cancelled']),
  calendarId: z.string().min(1),
  eventId: z.string().min(1),
  revisionId: z.string().min(1),
  event: calendarEventSchema
});

export const calendarTargetSchema = z.object({
  calendarId: z
    .string()
    .min(1)
    .refine(id => id !== 'primary'),
  ownerId: z.string().min(1)
});

const channelSchema = googleWatchChannelSchema.extend({ resourceUri: z.url() });

export const calendarRegistrationSchema = calendarTargetSchema.extend({
  initialSyncToken: z.string().min(1).optional(),
  initialPageToken: z.string().min(1).optional(),
  channel: channelSchema,
  previousChannels: z.array(channelSchema),
  renewalOperationId: z.string().optional(),
  tokenSeed: z.string().min(1).optional()
});

export const calendarStateSchema = z.object({
  version: z.literal(1),
  ownerId: z.string().min(1),
  // Without a sync token the calendar's silent baseline is still being read.
  calendars: z.record(
    z.string(),
    z.object({
      syncToken: z.string().min(1).optional(),
      pageToken: z.string().min(1).optional()
    })
  )
});

export type CalendarRegistration = z.infer<typeof calendarRegistrationSchema>;
