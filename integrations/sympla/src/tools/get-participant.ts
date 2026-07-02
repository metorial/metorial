import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getParticipantTool = SlateTool.create(spec, {
  name: 'Get Participant',
  key: 'get_participant',
  description: `Retrieve detailed information about a specific participant. Look up by either ticket ID or ticket number. Includes check-in status and custom form data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('Event ID the participant belongs to'),
      ticketId: z
        .number()
        .optional()
        .describe('Participant ticket ID (use this or ticketNumber)'),
      ticketNumber: z
        .string()
        .optional()
        .describe('Ticket number printed on the ticket (use this or ticketId)')
    })
  )
  .output(
    z.object({
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
      checkedInDate: z.string().describe('Check-in date, if checked in'),
      customForm: z.record(z.string(), z.string()).describe('Custom form field responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (!ctx.input.ticketId && !ctx.input.ticketNumber) {
      throw new Error('Either ticketId or ticketNumber must be provided.');
    }

    let p: any;
    if (ctx.input.ticketId) {
      p = await client.getParticipantByTicketId(ctx.input.eventId, ctx.input.ticketId);
    } else {
      p = await client.getParticipantByTicketNumber(
        ctx.input.eventId,
        ctx.input.ticketNumber!
      );
    }

    let output = {
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
      checkedInDate: p.checkin?.checked_in_date ?? '',
      customForm: p.custom_form ?? {}
    };

    return {
      output,
      message: `Retrieved participant **${output.firstName} ${output.lastName}** (${output.email}). Check-in: ${output.checkedIn ? 'Yes' : 'No'}.`
    };
  })
  .build();
