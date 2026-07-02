import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalString } from '../lib/output';
import { spec } from '../spec';

export let getEvent = SlateTool.create(spec, {
  name: 'Get Calendar Event',
  key: 'get_event',
  description: `Retrieve the full details of a specific calendar event by its ID, including the complete body, attendees with response status, recurrence pattern, and online meeting information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The ID of the calendar event to retrieve')
    })
  )
  .output(
    z.object({
      eventId: z.string(),
      subject: z.string().optional(),
      bodyContentType: z.string().optional(),
      bodyContent: z.string().optional(),
      startDateTime: z.string().optional(),
      startTimeZone: z.string().optional(),
      endDateTime: z.string().optional(),
      endTimeZone: z.string().optional(),
      locationDisplayName: z.string().optional(),
      isAllDay: z.boolean().optional(),
      isCancelled: z.boolean().optional(),
      isOnlineMeeting: z.boolean().optional(),
      onlineMeetingJoinUrl: z.string().optional(),
      organizerEmail: z.string().optional(),
      organizerName: z.string().optional(),
      attendees: z
        .array(
          z.object({
            email: z.string(),
            name: z.string().optional(),
            type: z.string(),
            responseStatus: z.string().optional()
          })
        )
        .optional(),
      recurrence: z.any().optional(),
      reminderMinutesBeforeStart: z.number().optional(),
      showAs: z.string().optional(),
      importance: z.string().optional(),
      sensitivity: z.string().optional(),
      hasAttachments: z.boolean().optional(),
      webLink: z.string().optional(),
      categories: z.array(z.string()).optional(),
      createdDateTime: z.string().optional(),
      lastModifiedDateTime: z.string().optional(),
      seriesMasterId: z.string().optional(),
      type: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let ev = await client.getEvent(ctx.input.eventId);

    return {
      output: {
        eventId: ev.id,
        subject: ev.subject,
        bodyContentType: ev.body?.contentType,
        bodyContent: ev.body?.content,
        startDateTime: ev.start?.dateTime,
        startTimeZone: ev.start?.timeZone,
        endDateTime: ev.end?.dateTime,
        endTimeZone: ev.end?.timeZone,
        locationDisplayName: ev.location?.displayName,
        isAllDay: ev.isAllDay,
        isCancelled: ev.isCancelled,
        isOnlineMeeting: ev.isOnlineMeeting,
        onlineMeetingJoinUrl: optionalString(ev.onlineMeeting?.joinUrl || ev.onlineMeetingUrl),
        organizerEmail: optionalString(ev.organizer?.emailAddress?.address),
        organizerName: optionalString(ev.organizer?.emailAddress?.name),
        attendees: ev.attendees?.map(a => ({
          email: a.emailAddress.address,
          name: optionalString(a.emailAddress.name),
          type: a.type,
          responseStatus: optionalString(a.status?.response)
        })),
        recurrence: ev.recurrence,
        reminderMinutesBeforeStart: ev.reminderMinutesBeforeStart,
        showAs: ev.showAs,
        importance: ev.importance,
        sensitivity: ev.sensitivity,
        hasAttachments: ev.hasAttachments,
        webLink: ev.webLink,
        categories: ev.categories,
        createdDateTime: ev.createdDateTime,
        lastModifiedDateTime: ev.lastModifiedDateTime,
        seriesMasterId: optionalString(ev.seriesMasterId),
        type: optionalString(ev.type)
      },
      message: `Retrieved event **"${ev.subject || '(no subject)'}"** on ${ev.start?.dateTime || 'unknown date'}.`
    };
  })
  .build();
