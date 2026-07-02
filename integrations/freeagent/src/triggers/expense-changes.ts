import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let expenseChanges = SlateTrigger.create(spec, {
  name: 'Expense Changes',
  key: 'expense_changes',
  description: 'Polls for new or updated expenses in FreeAgent.'
})
  .input(
    z.object({
      expenseId: z.string().describe('FreeAgent expense ID'),
      category: z.string().optional().describe('Category URL'),
      grossValue: z.string().optional().describe('Gross value'),
      currency: z.string().optional().describe('Currency code'),
      description: z.string().optional().describe('Expense description'),
      datedOn: z.string().optional().describe('Expense date'),
      user: z.string().optional().describe('User URL'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      raw: z.record(z.string(), z.any()).optional().describe('Full expense payload')
    })
  )
  .output(
    z.object({
      expenseId: z.string().describe('FreeAgent expense ID'),
      category: z.string().optional().describe('Category URL'),
      grossValue: z.string().optional().describe('Gross value'),
      currency: z.string().optional().describe('Currency code'),
      description: z.string().optional().describe('Expense description'),
      datedOn: z.string().optional().describe('Expense date'),
      user: z.string().optional().describe('User URL'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FreeAgentClient({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let lastPolled = ctx.state?.lastPolled as string | undefined;
      let expenses = await client.listExpenses({
        updatedSince: lastPolled
      });

      let now = new Date().toISOString();

      let inputs = expenses.map((e: any) => {
        let url = e.url || '';
        let expenseId = url.split('/').pop() || '';
        return {
          expenseId,
          category: e.category,
          grossValue: e.gross_value != null ? String(e.gross_value) : undefined,
          currency: e.currency,
          description: e.description,
          datedOn: e.dated_on,
          user: e.user,
          updatedAt: e.updated_at,
          createdAt: e.created_at,
          raw: e
        };
      });

      return {
        inputs,
        updatedState: {
          lastPolled: now
        }
      };
    },

    handleEvent: async ctx => {
      let isNew = ctx.input.createdAt === ctx.input.updatedAt;
      let eventType = isNew ? 'created' : 'updated';

      return {
        type: `expense.${eventType}`,
        id: `${ctx.input.expenseId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          expenseId: ctx.input.expenseId,
          category: ctx.input.category,
          grossValue: ctx.input.grossValue,
          currency: ctx.input.currency,
          description: ctx.input.description,
          datedOn: ctx.input.datedOn,
          user: ctx.input.user,
          updatedAt: ctx.input.updatedAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
