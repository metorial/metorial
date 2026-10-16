import { z } from 'zod';

export let attendeeSchema = z.object({
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
  changed: z.string().optional().describe('When the attendee record was last changed.')
});

export let mapAttendee = (att: any) => ({
  attendeeId: att.id,
  orderId: att.order_id ?? undefined,
  eventId: att.event_id ?? undefined,
  ticketClassName: att.ticket_class_name ?? undefined,
  ticketClassId: att.ticket_class_id ?? undefined,
  firstName: att.profile?.first_name ?? undefined,
  lastName: att.profile?.last_name ?? undefined,
  email: att.profile?.email ?? undefined,
  status: att.status ?? undefined,
  checkedIn: att.checked_in ?? undefined,
  created: att.created ?? undefined,
  changed: att.changed ?? undefined
});
