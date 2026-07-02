import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let eventScheduled = SlateTrigger.create(spec, {
  name: 'Event Scheduled',
  key: 'event_scheduled',
  description: 'Triggers when a new event is booked via Bonsai Scheduling.'
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the scheduled event'),
      title: z.string().optional().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      startTime: z.string().optional().describe('Event start time'),
      endTime: z.string().optional().describe('Event end time'),
      attendeeName: z.string().optional().describe('Attendee name'),
      attendeeEmail: z.string().optional().describe('Attendee email'),
      location: z.string().optional().describe('Event location or meeting link'),
      timestamp: z.string().optional().describe('When the event was scheduled')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the scheduled event'),
      title: z.string().optional().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      startTime: z.string().optional().describe('Event start time'),
      endTime: z.string().optional().describe('Event end time'),
      attendeeName: z.string().optional().describe('Attendee name'),
      attendeeEmail: z.string().optional().describe('Attendee email'),
      location: z.string().optional().describe('Event location or meeting link'),
      scheduledAt: z.string().optional().describe('When the event was scheduled')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let event = data.event ?? data.scheduling_event ?? data.resource ?? data;

      return {
        inputs: [
          {
            eventId: event.id ?? event.event_id ?? data.id ?? '',
            title: event.title ?? event.name ?? event.subject ?? undefined,
            description: event.description ?? event.notes ?? undefined,
            startTime: event.start_time ?? event.startTime ?? event.start ?? undefined,
            endTime: event.end_time ?? event.endTime ?? event.end ?? undefined,
            attendeeName:
              event.attendee_name ?? event.attendeeName ?? event.invitee_name ?? undefined,
            attendeeEmail:
              event.attendee_email ?? event.attendeeEmail ?? event.invitee_email ?? undefined,
            location: event.location ?? event.meeting_url ?? undefined,
            timestamp: data.timestamp ?? data.created_at ?? new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'event.scheduled',
        id: `event-${ctx.input.eventId}-scheduled-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          eventId: ctx.input.eventId,
          title: ctx.input.title,
          description: ctx.input.description,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          attendeeName: ctx.input.attendeeName,
          attendeeEmail: ctx.input.attendeeEmail,
          location: ctx.input.location,
          scheduledAt: ctx.input.timestamp
        }
      };
    }
  })
  .build();
