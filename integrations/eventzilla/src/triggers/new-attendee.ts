import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newAttendeeTrigger = SlateTrigger.create(spec, {
  name: 'New Attendee',
  key: 'new_attendee',
  description: 'Triggers when a new attendee is added to an event.'
})
  .input(
    z.object({
      attendeeId: z.number().describe('Attendee ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().optional().describe('Attendee email'),
      ticketType: z.string().optional().describe('Ticket type'),
      barCode: z.string().optional().describe('Unique barcode'),
      isAttended: z.string().optional().describe('Check-in status'),
      transactionRef: z.string().optional().describe('Transaction reference'),
      eventId: z.number().optional().describe('Event ID'),
      eventTitle: z.string().optional().describe('Event title')
    })
  )
  .output(
    z.object({
      attendeeId: z.number().describe('Attendee ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().optional().describe('Attendee email'),
      ticketType: z.string().optional().describe('Ticket type'),
      barCode: z.string().optional().describe('Unique barcode'),
      isAttended: z.string().optional().describe('Check-in status'),
      transactionRef: z.string().optional().describe('Transaction reference'),
      eventId: z.number().optional().describe('Event ID'),
      eventTitle: z.string().optional().describe('Event title')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let knownAttendeeIds: Record<string, boolean> =
        (ctx.state?.knownAttendeeIds as Record<string, boolean>) ?? {};
      let eventIds: string[] = (ctx.state?.eventIds as string[]) ?? [];

      // On first poll, discover events
      if (eventIds.length === 0) {
        let eventsData = await client.listEvents({ status: 'live', limit: 50 });
        let events = Array.isArray(eventsData?.events)
          ? eventsData.events
          : Array.isArray(eventsData)
            ? eventsData
            : [];
        eventIds = events.map((e: any) => String(e.id));
      }

      let newAttendees: any[] = [];

      for (let eventId of eventIds) {
        try {
          let data = await client.listEventAttendees(eventId, { limit: 50 });
          let attendees = Array.isArray(data?.attendees)
            ? data.attendees
            : Array.isArray(data)
              ? data
              : [];

          for (let a of attendees) {
            let id = String(a.id);
            if (!knownAttendeeIds[id]) {
              knownAttendeeIds[id] = true;
              // Only emit if not the initial seed poll
              if (ctx.state?.initialized) {
                newAttendees.push({
                  attendeeId: a.id,
                  firstName: a.first_name,
                  lastName: a.last_name,
                  email: a.email,
                  ticketType: a.ticket_type,
                  barCode: a.bar_code,
                  isAttended: a.is_attended,
                  transactionRef: a.transaction_ref,
                  eventId: a.event_id,
                  eventTitle: a.title
                });
              }
            }
          }
        } catch {
          // Skip events that may have been deleted or are inaccessible
        }
      }

      return {
        inputs: newAttendees,
        updatedState: {
          knownAttendeeIds,
          eventIds,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'attendee.created',
        id: String(ctx.input.attendeeId),
        output: {
          attendeeId: ctx.input.attendeeId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          ticketType: ctx.input.ticketType,
          barCode: ctx.input.barCode,
          isAttended: ctx.input.isAttended,
          transactionRef: ctx.input.transactionRef,
          eventId: ctx.input.eventId,
          eventTitle: ctx.input.eventTitle
        }
      };
    }
  })
  .build();
