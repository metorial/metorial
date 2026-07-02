import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAttendees = SlateTool.create(spec, {
  name: 'List Attendees',
  key: 'list_attendees',
  description: `List attendees for a specific event. Returns attendee details including name, email, ticket class, check-in status, and order information. Supports filtering by status and change timestamp.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The event ID to list attendees for.'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter attendees by status (e.g., "attending", "not_attending", "checked_in").'
        ),
      changedSince: z
        .string()
        .optional()
        .describe('Only return attendees changed since this UTC timestamp.'),
      page: z.number().optional().describe('Page number for pagination.')
    })
  )
  .output(
    z.object({
      attendees: z
        .array(
          z.object({
            attendeeId: z.string().describe('The unique attendee ID.'),
            orderId: z.string().optional().describe('The order ID this attendee belongs to.'),
            eventId: z.string().optional().describe('The event ID.'),
            ticketClassName: z.string().optional().describe('Name of the ticket class.'),
            ticketClassId: z.string().optional().describe('ID of the ticket class.'),
            firstName: z.string().optional().describe('Attendee first name.'),
            lastName: z.string().optional().describe('Attendee last name.'),
            email: z.string().optional().describe('Attendee email.'),
            status: z.string().optional().describe('Attendee status.'),
            checkedIn: z.boolean().optional().describe('Whether the attendee has checked in.'),
            created: z.string().optional().describe('When the attendee record was created.'),
            changed: z
              .string()
              .optional()
              .describe('When the attendee record was last changed.')
          })
        )
        .describe('List of attendees.'),
      hasMore: z.boolean().describe('Whether there are more pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listEventAttendees(ctx.input.eventId, {
      status: ctx.input.status,
      changed_since: ctx.input.changedSince,
      page: ctx.input.page
    });

    let attendees = (result.attendees || []).map((att: any) => ({
      attendeeId: att.id,
      orderId: att.order_id,
      eventId: att.event_id,
      ticketClassName: att.ticket_class_name,
      ticketClassId: att.ticket_class_id,
      firstName: att.profile?.first_name,
      lastName: att.profile?.last_name,
      email: att.profile?.email,
      status: att.status,
      checkedIn: att.checked_in,
      created: att.created,
      changed: att.changed
    }));

    return {
      output: {
        attendees,
        hasMore: result.pagination?.has_more_items || false
      },
      message: `Found **${attendees.length}** attendees for event \`${ctx.input.eventId}\`.`
    };
  })
  .build();
