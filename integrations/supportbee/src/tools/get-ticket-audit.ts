import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { auditEntrySchema } from '../lib/types';
import { spec } from '../spec';

export let getTicketAudit = SlateTool.create(spec, {
  name: 'Get Ticket Audit Trail',
  key: 'get_ticket_audit',
  description:
    'Retrieve the chronological action history for a support ticket, including actor names and activity timestamps.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ticketId: z.number().describe('Ticket ID from list_tickets or search_tickets')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('Ticket whose history was retrieved'),
      audit: z.array(auditEntrySchema).describe('Chronological ticket activity')
    })
  )
  .handleInvocation(async ctx => {
    if (!Number.isInteger(ctx.input.ticketId) || ctx.input.ticketId < 1) {
      throw createApiServiceError('ticketId must be a positive whole number.');
    }
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });
    let audit = await client.getTicketAudit(ctx.input.ticketId);
    return {
      output: { ticketId: ctx.input.ticketId, audit },
      message: `Retrieved **${audit.length}** activities for ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();
