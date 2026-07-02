import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listBills = SlateTool.create(spec, {
  name: 'List Bills',
  key: 'list_bills',
  description: `Retrieve supplier bills from FreeAgent. Supports filtering by status, date range, contact, or project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      view: z
        .enum([
          'all',
          'open',
          'overdue',
          'open_or_overdue',
          'paid',
          'recurring',
          'hire_purchase',
          'cis'
        ])
        .optional()
        .describe('Filter bills by status'),
      fromDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      toDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      updatedSince: z.string().optional().describe('ISO 8601 timestamp'),
      contactId: z.string().optional().describe('Filter by supplier contact ID'),
      projectId: z.string().optional().describe('Filter by project ID'),
      nestedItems: z.boolean().optional().describe('Include line items in the response'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      bills: z.array(z.record(z.string(), z.any())).describe('List of bill records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let bills = await client.listBills(ctx.input);
    let count = bills.length;

    return {
      output: { bills },
      message: `Found **${count}** bill${count !== 1 ? 's' : ''}${ctx.input.view ? ` (${ctx.input.view})` : ''}.`
    };
  })
  .build();
