import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `Retrieve expenses from FreeAgent with optional filtering by date range, project, or view type (recent, recurring).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      view: z.enum(['recent', 'recurring']).optional().describe('Filter expenses by view'),
      fromDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      toDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      updatedSince: z.string().optional().describe('ISO 8601 timestamp'),
      projectId: z.string().optional().describe('Filter by project ID'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      expenses: z.array(z.record(z.string(), z.any())).describe('List of expense records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let expenses = await client.listExpenses(ctx.input);
    let count = expenses.length;

    return {
      output: { expenses },
      message: `Found **${count}** expense${count !== 1 ? 's' : ''}${ctx.input.fromDate ? ` from ${ctx.input.fromDate}` : ''}${ctx.input.toDate ? ` to ${ctx.input.toDate}` : ''}.`
    };
  })
  .build();
