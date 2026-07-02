import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve invoices from FreeAgent with filtering by status, contact, project, and date. Can optionally include nested line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      view: z
        .enum([
          'all',
          'recent_open_or_overdue',
          'open',
          'overdue',
          'open_or_overdue',
          'draft',
          'paid',
          'scheduled_to_email',
          'thank_you_emails',
          'reminder_emails',
          'last_N_months'
        ])
        .optional()
        .describe('Filter invoices by status'),
      sort: z
        .enum(['created_at', '-created_at', 'updated_at', '-updated_at'])
        .optional()
        .describe('Sort order. Prefix with - for descending.'),
      updatedSince: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp. Only return invoices updated after this time.'),
      contactId: z.string().optional().describe('Filter by contact ID'),
      projectId: z.string().optional().describe('Filter by project ID'),
      nestedItems: z.boolean().optional().describe('Include line items in the response'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      invoices: z.array(z.record(z.string(), z.any())).describe('List of invoice records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let invoices = await client.listInvoices(ctx.input);
    let count = invoices.length;

    return {
      output: { invoices },
      message: `Found **${count}** invoice${count !== 1 ? 's' : ''}${ctx.input.view ? ` (view: ${ctx.input.view})` : ''}.`
    };
  })
  .build();
