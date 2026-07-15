import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import type { CalendarEvent } from '../lib/client';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

let eventDateTimeSchema = z.object({
  dateTime: z.string().optional().describe('RFC3339 timestamp for a timed event'),
  date: z.string().optional().describe('Date in YYYY-MM-DD format for an all-day event'),
  timeZone: z.string().optional().describe('IANA time zone')
});

let attendeeSchema = z.object({
  email: z.string().describe('Attendee email address'),
  displayName: z.string().optional().describe('Attendee display name'),
  optional: z.boolean().optional().describe('Whether the attendee is optional'),
  responseStatus: z
    .enum(['needsAction', 'declined', 'tentative', 'accepted'])
    .optional()
    .describe('Attendee response status'),
  comment: z.string().optional().describe('Attendee response comment')
});

let reminderOverrideSchema = z.object({
  method: z.enum(['email', 'popup']).describe('Reminder method'),
  minutes: z.number().describe('Minutes before the event')
});

let batchOperationSchema = z.object({
  op: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
  calendarId: z
    .string()
    .default('primary')
    .describe("Calendar ID. Defaults to the authenticated user's primary calendar."),
  eventId: z.string().optional().describe('Event ID, required for update and delete'),
  summary: z
    .string()
    .optional()
    .describe('Event title. Required for create and optional for update.'),
  description: z.string().optional().describe('Event description'),
  location: z.string().optional().describe('Event location'),
  start: eventDateTimeSchema
    .optional()
    .describe('Event start. Required for create and optional for update.'),
  end: eventDateTimeSchema
    .optional()
    .describe('Event end. Required for create and optional for update.'),
  attendees: z.array(attendeeSchema).optional().describe('Complete attendee list'),
  recurrence: z.array(z.string()).optional().describe('Recurrence rules in RRULE format'),
  reminders: z
    .object({
      useDefault: z.boolean().describe('Whether to use calendar default reminders'),
      overrides: z
        .array(reminderOverrideSchema)
        .optional()
        .describe('Custom reminder overrides')
    })
    .optional()
    .describe('Event reminder settings'),
  colorId: z.string().optional().describe('Event color ID'),
  visibility: z
    .enum(['default', 'public', 'private', 'confidential'])
    .optional()
    .describe('Event visibility'),
  transparency: z
    .enum(['opaque', 'transparent'])
    .optional()
    .describe('Whether the event blocks availability'),
  status: z
    .enum(['confirmed', 'tentative', 'cancelled'])
    .optional()
    .describe('Event status. Forwarded on both create and update operations.'),
  guestsCanModify: z.boolean().optional().describe('Whether guests can modify the event'),
  guestsCanInviteOthers: z
    .boolean()
    .optional()
    .describe('Whether guests can invite other guests'),
  guestsCanSeeOtherGuests: z
    .boolean()
    .optional()
    .describe('Whether guests can see the attendee list'),
  addGoogleMeet: z
    .boolean()
    .optional()
    .describe('For create operations, whether to add a Google Meet conference'),
  sendUpdates: z
    .enum(['all', 'externalOnly', 'none'])
    .optional()
    .describe('Guests who should receive notifications for this operation')
});

let toEventBody = (operation: z.infer<typeof batchOperationSchema>): CalendarEvent => ({
  summary: operation.summary,
  description: operation.description,
  location: operation.location,
  start: operation.start,
  end: operation.end,
  attendees: operation.attendees,
  recurrence: operation.recurrence,
  reminders: operation.reminders,
  colorId: operation.colorId,
  visibility: operation.visibility,
  transparency: operation.transparency,
  status: operation.status,
  guestsCanModify: operation.guestsCanModify,
  guestsCanInviteOthers: operation.guestsCanInviteOthers,
  guestsCanSeeOtherGuests: operation.guestsCanSeeOtherGuests
});

export let batchModifyEvents = SlateTool.create(spec, {
  name: 'Batch Modify Events',
  key: 'batch_modify_events',
  description:
    'Create, update, or delete multiple Google Calendar events in one tool call. Operations run sequentially and each returns its own success or error result.',
  instructions: [
    'Each operation is an independent Calendar API request; this tool does not use the multipart batch endpoint.',
    'Create requires summary, start, and end. Update and delete require eventId.',
    'A failed item does not stop later operations. Inspect every result and retry only failed items.',
    'For update operations, attendees replaces the entire attendee list of the event. To change a single attendee RSVP, use respond_to_event instead.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleCalendarActionScopes.batchModifyEvents)
  .input(
    z.object({
      operations: z
        .array(batchOperationSchema)
        .min(1)
        .max(50)
        .describe('One to 50 event create, update, or delete operations')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            index: z.number().describe('Zero-based input operation index'),
            op: z.enum(['create', 'update', 'delete']).describe('Operation attempted'),
            success: z.boolean().describe('Whether the operation succeeded'),
            calendarId: z.string().describe('Calendar ID used for the operation'),
            eventId: z.string().optional().describe('Created, updated, or deleted event ID'),
            summary: z.string().optional().describe('Event title returned by Google'),
            status: z.string().optional().describe('Event status returned by Google'),
            htmlLink: z.string().optional().describe('URL to view the event'),
            error: z.string().optional().describe('User-facing error for a failed operation')
          })
        )
        .describe('Per-operation results in input order'),
      successCount: z.number().describe('Number of successful operations'),
      errorCount: z.number().describe('Number of failed operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleCalendarClient(ctx.auth.token);
    let results: Array<{
      index: number;
      op: 'create' | 'update' | 'delete';
      success: boolean;
      calendarId: string;
      eventId?: string;
      summary?: string;
      status?: string;
      htmlLink?: string;
      error?: string;
    }> = [];

    for (let [index, operation] of ctx.input.operations.entries()) {
      try {
        if (operation.op === 'create') {
          if (!operation.summary || !operation.start || !operation.end) {
            throw createApiServiceError(
              `Operation ${index} requires summary, start, and end for create.`
            );
          }

          let eventBody = toEventBody(operation);
          let conferenceDataVersion: number | undefined;
          if (operation.addGoogleMeet) {
            eventBody.conferenceData = {
              createRequest: {
                requestId: `batch-meet-${Date.now()}-${index}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' }
              }
            };
            conferenceDataVersion = 1;
          }

          let event = await client.createEvent(operation.calendarId, eventBody, {
            sendUpdates: operation.sendUpdates,
            conferenceDataVersion
          });
          results.push({
            index,
            op: operation.op,
            success: true,
            calendarId: operation.calendarId,
            eventId: event.id,
            summary: event.summary,
            status: event.status,
            htmlLink: event.htmlLink
          });
          continue;
        }

        if (!operation.eventId) {
          throw createApiServiceError(
            `Operation ${index} requires eventId for ${operation.op}.`
          );
        }

        if (operation.op === 'update') {
          let eventBody = toEventBody(operation);
          let hasUpdates = Object.values(eventBody).some(value => value !== undefined);
          if (!hasUpdates) {
            throw createApiServiceError(
              `Operation ${index} requires at least one event field for update.`
            );
          }

          let event = await client.updateEvent(
            operation.calendarId,
            operation.eventId,
            eventBody,
            { sendUpdates: operation.sendUpdates }
          );
          results.push({
            index,
            op: operation.op,
            success: true,
            calendarId: operation.calendarId,
            eventId: event.id ?? operation.eventId,
            summary: event.summary,
            status: event.status,
            htmlLink: event.htmlLink
          });
          continue;
        }

        await client.deleteEvent(operation.calendarId, operation.eventId, {
          sendUpdates: operation.sendUpdates
        });
        results.push({
          index,
          op: operation.op,
          success: true,
          calendarId: operation.calendarId,
          eventId: operation.eventId
        });
      } catch (error) {
        let serviceError = buildApiServiceError(error, {
          providerLabel: 'Google Calendar',
          operation: `${operation.op} event for batch item ${index}`,
          reason: 'google_calendar_api_error',
          nestedKeys: ['error', 'errors']
        });
        results.push({
          index,
          op: operation.op,
          success: false,
          calendarId: operation.calendarId,
          eventId: operation.eventId,
          error: serviceError.data.message
        });
      }
    }

    let successCount = results.filter(result => result.success).length;
    let errorCount = results.length - successCount;

    return {
      output: { results, successCount, errorCount },
      message: `Completed **${results.length}** event operation(s): **${successCount}** succeeded and **${errorCount}** failed.`
    };
  })
  .build();
