import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ticketSchema = z.object({
  ticketId: z.string().describe('Unique identifier for the ticket'),
  number: z.number().optional().describe('Ticket number'),
  firstName: z.string().optional().describe('Ticket holder first name'),
  lastName: z.string().optional().describe('Ticket holder last name'),
  status: z.string().optional().describe('Ticket status'),
  price: z.number().optional().describe('Ticket price'),
  netPrice: z.number().optional().describe('Net price after adjustments'),
  fee: z.number().optional().describe('Booking fee'),
  taxes: z.number().optional().describe('Tax amount'),
  total: z.number().optional().describe('Total ticket cost'),
  orderId: z.string().optional().describe('ID of the associated order'),
  eventId: z.string().optional().describe('ID of the associated event'),
  ticketTypeId: z.string().optional().describe('ID of the ticket type'),
  ticketTypeName: z.string().optional().describe('Name of the ticket type'),
  isDonation: z.boolean().optional().describe('Whether this ticket is a donation'),
  checkInHistory: z.array(z.any()).optional().describe('Check-in history entries'),
  qrCodeData: z.any().optional().describe('QR code data for the ticket'),
  totalsV2: z
    .any()
    .optional()
    .describe('Detailed fee breakdown including absorb/pass-on splits')
});

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `List all tickets for a specific Humanitix event. Returns individual ticket details including holder info, pricing breakdown, check-in status, and associated order.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The event ID to retrieve tickets for'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of tickets per page (max 100)')
    })
  )
  .output(
    z.object({
      tickets: z.array(ticketSchema).describe('List of tickets'),
      totalResults: z.number().optional().describe('Total number of tickets available'),
      page: z.number().optional().describe('Current page number'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getTickets(ctx.input.eventId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let tickets = (response.tickets || []).map((ticket: any) => ({
      ticketId: ticket._id,
      number: ticket.number,
      firstName: ticket.firstName,
      lastName: ticket.lastName,
      status: ticket.status,
      price: ticket.price,
      netPrice: ticket.netPrice,
      fee: ticket.fee,
      taxes: ticket.taxes,
      total: ticket.total,
      orderId: ticket.orderId,
      eventId: ticket.eventId,
      ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: ticket.ticketTypeName,
      isDonation: ticket.isDonation,
      checkInHistory: ticket.checkInHistory,
      qrCodeData: ticket.qrCodeData,
      totalsV2: ticket.totalsV2
    }));

    return {
      output: {
        tickets,
        totalResults: response.totalResults,
        page: response.page,
        pageSize: response.pageSize
      },
      message: `Found **${tickets.length}** tickets${response.totalResults ? ` out of ${response.totalResults} total` : ''} for event \`${ctx.input.eventId}\`.`
    };
  })
  .build();
