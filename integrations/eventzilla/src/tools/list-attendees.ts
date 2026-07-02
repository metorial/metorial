import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attendeeSchema = z.object({
  attendeeId: z.number().describe('Attendee ID'),
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  email: z.string().optional().describe('Attendee email'),
  ticketType: z.string().optional().describe('Ticket type name'),
  barCode: z.string().optional().describe('Unique barcode'),
  isAttended: z.string().optional().describe('Check-in status: yes or no'),
  transactionRef: z.string().optional().describe('Transaction reference number'),
  transactionDate: z.string().optional().describe('Transaction date'),
  transactionAmount: z.string().optional().describe('Transaction amount'),
  transactionStatus: z.string().optional().describe('Transaction status'),
  eventDate: z.string().optional().describe('Event date'),
  eventId: z.number().optional().describe('Event ID'),
  eventTitle: z.string().optional().describe('Event title'),
  buyerFirstName: z.string().optional().describe('Buyer first name'),
  buyerLastName: z.string().optional().describe('Buyer last name'),
  paymentType: z.string().optional().describe('Payment type'),
  questions: z
    .array(
      z.object({
        question: z.string().optional().describe('Question text'),
        answer: z.string().optional().describe('Answer text')
      })
    )
    .optional()
    .describe('Custom question responses')
});

export let listAttendeesTool = SlateTool.create(spec, {
  name: 'List Attendees',
  key: 'list_attendees',
  description: `Retrieve attendees for a specific event, including name, ticket type, barcode, check-in status, and custom question responses. Use the **Get Attendee** tool for individual attendee details by attendee ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The event ID to get attendees for'),
      offset: z.number().optional().describe('Number of records to skip'),
      limit: z.number().optional().describe('Number of records per page')
    })
  )
  .output(
    z.object({
      attendees: z.array(attendeeSchema).describe('List of attendees')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listEventAttendees(ctx.input.eventId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let rawAttendees = Array.isArray(data?.attendees)
      ? data.attendees
      : Array.isArray(data)
        ? data
        : [];

    let attendees = rawAttendees.map((a: any) => ({
      attendeeId: a.id,
      firstName: a.first_name,
      lastName: a.last_name,
      email: a.email,
      ticketType: a.ticket_type,
      barCode: a.bar_code,
      isAttended: a.is_attended,
      transactionRef: a.transaction_ref,
      transactionDate: a.transaction_date,
      transactionAmount: a.transaction_amount,
      transactionStatus: a.transaction_status,
      eventDate: a.event_date,
      eventId: a.event_id,
      eventTitle: a.title,
      buyerFirstName: a.buyer_first_name,
      buyerLastName: a.buyer_last_name,
      paymentType: a.payment_type,
      questions: a.questions?.map((q: any) => ({
        question: q.questions ?? q.question,
        answer: q.answer
      }))
    }));

    return {
      output: { attendees },
      message: `Found **${attendees.length}** attendee(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();
