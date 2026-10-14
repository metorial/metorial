import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { eventIdSchema, overrideLocationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageTicketCheckIn = SlateTool.create(spec, {
  name: 'Manage Ticket Check-In',
  key: 'manage_ticket_check_in',
  description:
    'Check a Humanitix ticket in or out and return the provider scanning messages. Call list_events and list_tickets to discover IDs, and get_ticket to inspect the current check-in state.',
  instructions: [
    'The ticket must be eligible for scanning and the account must have permission to manage its event.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      eventId: eventIdSchema,
      ticketId: z.string().describe('Ticket ID. Call list_tickets to discover ticket IDs.'),
      action: z
        .enum(['check_in', 'check_out'])
        .describe('Whether to check the ticket in or out.'),
      overrideLocation: overrideLocationSchema
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Event ID associated with the ticket'),
      ticketId: z.string().describe('Ticket ID that was scanned'),
      action: z.enum(['check_in', 'check_out']).describe('Requested scanning action'),
      scanningMessages: z
        .array(
          z.object({
            header: z.string().describe('Scanning message heading'),
            message: z.string().describe('Scanning message content, which may contain HTML')
          })
        )
        .describe('Scanning messages returned by Humanitix')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.manageTicketCheckIn(
      ctx.input.eventId,
      ctx.input.ticketId,
      ctx.input.action,
      { overrideLocation: ctx.input.overrideLocation }
    );
    return {
      output: {
        eventId: ctx.input.eventId,
        ticketId: ctx.input.ticketId,
        action: ctx.input.action,
        scanningMessages: result.scanningMessages
      },
      message: `Checked ${ctx.input.action === 'check_in' ? 'in' : 'out'} ticket \`${ctx.input.ticketId}\`.`
    };
  })
  .build();
