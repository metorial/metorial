import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attendeeSchema = z.object({
  email: z.string(),
  name: z.string().optional(),
  type: z.enum(['required', 'optional', 'resource']).default('required')
});

export let manageEvent = SlateTool.create(spec, {
  name: 'Manage Calendar Event',
  key: 'manage_event',
  description: `Update, respond to, or delete a calendar event. Use **action** to specify the operation: **update** to modify event properties, **respond** to accept/tentatively accept/decline the event, or **delete** to remove it.`,
  instructions: [
    'For **update**: provide the fields to change. Only provided fields are updated.',
    'For **respond**: specify responseType (accept, tentativelyAccept, decline) with an optional comment.',
    'For **delete**: only the eventId is required.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The ID of the event to manage'),
      action: z.enum(['update', 'respond', 'delete']).describe('The action to perform'),

      // Update fields
      subject: z.string().optional(),
      bodyContent: z.string().optional(),
      bodyContentType: z.enum(['text', 'html']).optional(),
      startDateTime: z.string().optional(),
      startTimeZone: z.string().optional(),
      endDateTime: z.string().optional(),
      endTimeZone: z.string().optional(),
      location: z.string().optional(),
      attendees: z.array(attendeeSchema).optional(),
      isAllDay: z.boolean().optional(),
      isOnlineMeeting: z.boolean().optional(),
      reminderMinutesBeforeStart: z.number().optional(),
      showAs: z
        .enum(['free', 'tentative', 'busy', 'oof', 'workingElsewhere', 'unknown'])
        .optional(),
      importance: z.enum(['low', 'normal', 'high']).optional(),
      sensitivity: z.enum(['normal', 'personal', 'private', 'confidential']).optional(),
      categories: z.array(z.string()).optional(),

      // Respond fields
      responseType: z
        .enum(['accept', 'tentativelyAccept', 'decline'])
        .optional()
        .describe('Response type for respond action'),
      comment: z.string().optional().describe('Comment to include with the response'),
      sendResponse: z
        .boolean()
        .optional()
        .describe('Whether to send the response to the organizer')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      eventId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { eventId, action } = ctx.input;

    switch (action) {
      case 'update': {
        let updates: Record<string, any> = {};
        if (ctx.input.subject !== undefined) updates.subject = ctx.input.subject;
        if (ctx.input.bodyContent !== undefined) {
          updates.body = {
            contentType: ctx.input.bodyContentType || 'html',
            content: ctx.input.bodyContent
          };
        }
        if (ctx.input.startDateTime && ctx.input.startTimeZone) {
          updates.start = {
            dateTime: ctx.input.startDateTime,
            timeZone: ctx.input.startTimeZone
          };
        }
        if (ctx.input.endDateTime && ctx.input.endTimeZone) {
          updates.end = { dateTime: ctx.input.endDateTime, timeZone: ctx.input.endTimeZone };
        }
        if (ctx.input.location !== undefined) {
          updates.location = { displayName: ctx.input.location };
        }
        if (ctx.input.attendees) {
          updates.attendees = ctx.input.attendees.map(a => ({
            emailAddress: { address: a.email, name: a.name },
            type: a.type
          }));
        }
        if (ctx.input.isAllDay !== undefined) updates.isAllDay = ctx.input.isAllDay;
        if (ctx.input.isOnlineMeeting !== undefined)
          updates.isOnlineMeeting = ctx.input.isOnlineMeeting;
        if (ctx.input.reminderMinutesBeforeStart !== undefined)
          updates.reminderMinutesBeforeStart = ctx.input.reminderMinutesBeforeStart;
        if (ctx.input.showAs !== undefined) updates.showAs = ctx.input.showAs;
        if (ctx.input.importance !== undefined) updates.importance = ctx.input.importance;
        if (ctx.input.sensitivity !== undefined) updates.sensitivity = ctx.input.sensitivity;
        if (ctx.input.categories !== undefined) updates.categories = ctx.input.categories;

        await client.updateEvent(eventId, updates);
        return {
          output: { success: true, eventId },
          message: `Updated event **${eventId}**.`
        };
      }
      case 'respond': {
        if (!ctx.input.responseType) {
          throw new Error('responseType is required for respond action');
        }
        await client.respondToEvent(
          eventId,
          ctx.input.responseType,
          ctx.input.comment,
          ctx.input.sendResponse
        );
        return {
          output: { success: true, eventId },
          message: `Responded **${ctx.input.responseType}** to event **${eventId}**.`
        };
      }
      case 'delete': {
        await client.deleteEvent(eventId);
        return {
          output: { success: true, eventId },
          message: `Deleted event **${eventId}**.`
        };
      }
    }
  })
  .build();
