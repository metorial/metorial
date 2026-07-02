import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let participantSchema = z.object({
  participantId: z.number().describe('Unique participant/ticket identifier'),
  orderId: z.string().describe('Associated order ID'),
  firstName: z.string().describe('Participant first name'),
  lastName: z.string().describe('Participant last name'),
  email: z.string().describe('Participant email'),
  ticketNumber: z.string().describe('Ticket number printed on the ticket'),
  ticketNumStart: z.string().describe('Ticket number start'),
  ticketName: z.string().describe('Ticket type name'),
  ticketSalePrice: z.number().describe('Ticket sale price'),
  checkedIn: z.boolean().describe('Whether the participant has checked in'),
  checkedInDate: z.string().describe('Check-in date, if checked in')
});

export let listParticipantsTool = SlateTool.create(spec, {
  name: 'List Participants',
  key: 'list_participants',
  description: `Retrieve a paginated list of participants (attendees) for a specific event. Optionally filter by order to see only participants from a specific purchase.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('Event ID to list participants for'),
      orderId: z
        .string()
        .optional()
        .describe('If provided, only returns participants from this specific order'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page (1-200)'),
      fieldSort: z.string().optional().describe('Field to sort results by'),
      sort: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      participants: z.array(participantSchema).describe('List of participants'),
      hasNextPage: z.boolean().describe('Whether more pages are available'),
      totalQuantity: z.number().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result: any;
    if (ctx.input.orderId) {
      result = await client.listParticipantsByOrder(ctx.input.eventId, ctx.input.orderId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        fieldSort: ctx.input.fieldSort,
        sort: ctx.input.sort
      });
    } else {
      result = await client.listParticipantsByEvent(ctx.input.eventId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        fieldSort: ctx.input.fieldSort,
        sort: ctx.input.sort
      });
    }

    let participants = result.data.map((p: any) => ({
      participantId: p.id ?? 0,
      orderId: p.order_id ?? '',
      firstName: p.first_name ?? '',
      lastName: p.last_name ?? '',
      email: p.email ?? '',
      ticketNumber: p.ticket_number ?? '',
      ticketNumStart: p.ticket_num_start ?? '',
      ticketName: p.ticket_name ?? '',
      ticketSalePrice: p.ticket_sale_price ?? 0,
      checkedIn: p.checkin?.checked_in ?? false,
      checkedInDate: p.checkin?.checked_in_date ?? ''
    }));

    let scope = ctx.input.orderId
      ? `order ${ctx.input.orderId}`
      : `event ${ctx.input.eventId}`;
    return {
      output: {
        participants,
        hasNextPage: result.pagination.hasNext,
        totalQuantity: result.pagination.quantity
      },
      message: `Found **${participants.length}** participants for ${scope}.${result.pagination.hasNext ? ' More pages available.' : ''}`
    };
  })
  .build();
