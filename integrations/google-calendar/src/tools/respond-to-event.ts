import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let respondToEvent = SlateTool.create(spec, {
  name: 'Respond to Event',
  key: 'respond_to_event',
  description:
    "Accept, decline, or tentatively accept a Google Calendar invitation without replacing the event's attendee list.",
  instructions: [
    'By default, the authenticated user is selected from the attendee whose self field is true.',
    'Provide attendeeEmail only when the response should target a specific attendee entry.',
    'The tool patches only the selected attendee response and preserves every other attendee.',
    'For recurring events, passing the series master event ID applies the response to every instance. To respond to a single occurrence, pass that instance ID, obtained from list_events with singleEvents enabled.',
    'attendeeEmail is intended for organizer-on-behalf responses. Google does not document merge behavior for non-self attendees on all tenants, so verify the recorded response when using it.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleCalendarActionScopes.respondToEvent)
  .input(
    z.object({
      calendarId: z
        .string()
        .default('primary')
        .describe('Calendar ID containing the event. Use "primary" for the primary calendar.'),
      eventId: z.string().describe('Event ID to respond to'),
      responseStatus: z
        .enum(['accepted', 'declined', 'tentative'])
        .describe('Invitation response to record'),
      attendeeEmail: z
        .string()
        .optional()
        .describe(
          'Attendee email to update. Omit to respond as the authenticated attendee marked self.'
        ),
      comment: z.string().optional().describe('Optional attendee response comment'),
      sendUpdates: z
        .enum(['all', 'externalOnly', 'none'])
        .optional()
        .describe('Guests who should receive notifications about this response')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Event ID'),
      calendarId: z.string().describe('Calendar ID containing the event'),
      attendeeEmail: z.string().describe('Attendee email whose response was updated'),
      responseStatus: z
        .enum(['accepted', 'declined', 'tentative'])
        .describe('Recorded invitation response'),
      comment: z.string().optional().describe('Recorded attendee response comment'),
      summary: z.string().optional().describe('Event title'),
      htmlLink: z.string().optional().describe('URL to view the event'),
      updated: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    try {
      let client = new GoogleCalendarClient(ctx.auth.token);
      let event = await client.getEvent(ctx.input.calendarId, ctx.input.eventId);
      let requestedEmail = ctx.input.attendeeEmail?.toLowerCase();
      let attendee = event.attendees?.find(candidate => {
        if (!candidate.email) return false;
        return requestedEmail
          ? candidate.email.toLowerCase() === requestedEmail
          : candidate.self === true;
      });

      if (!attendee) {
        throw createApiServiceError(
          requestedEmail
            ? `Event ${ctx.input.eventId} does not include attendee ${ctx.input.attendeeEmail}.`
            : `Event ${ctx.input.eventId} does not include an attendee marked as the authenticated user. Provide attendeeEmail to select an attendee explicitly.`
        );
      }

      let attendeePatch = {
        email: attendee.email,
        responseStatus: ctx.input.responseStatus,
        ...(ctx.input.comment !== undefined ? { comment: ctx.input.comment } : {})
      };
      let updatedEvent = await client.updateEvent(
        ctx.input.calendarId,
        ctx.input.eventId,
        {
          attendees: [attendeePatch],
          attendeesOmitted: true
        },
        { sendUpdates: ctx.input.sendUpdates }
      );
      let recordedAttendee = updatedEvent.attendees?.find(
        candidate => candidate.email?.toLowerCase() === attendee.email.toLowerCase()
      );
      let recordedStatus =
        recordedAttendee?.responseStatus === 'accepted' ||
        recordedAttendee?.responseStatus === 'declined' ||
        recordedAttendee?.responseStatus === 'tentative'
          ? recordedAttendee.responseStatus
          : ctx.input.responseStatus;

      return {
        output: {
          eventId: updatedEvent.id ?? ctx.input.eventId,
          calendarId: ctx.input.calendarId,
          attendeeEmail: attendee.email,
          responseStatus: recordedStatus,
          comment: recordedAttendee?.comment ?? ctx.input.comment,
          summary: updatedEvent.summary,
          htmlLink: updatedEvent.htmlLink,
          updated: updatedEvent.updated
        },
        message: `Recorded **${recordedStatus}** for attendee **${attendee.email}** on event **"${updatedEvent.summary ?? event.summary ?? ctx.input.eventId}"**.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Calendar',
        operation: 'respond to event',
        reason: 'google_calendar_api_error',
        nestedKeys: ['error', 'errors']
      });
    }
  })
  .build();
