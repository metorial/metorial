import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let budgetSchema = z.object({
  budgetId: z.string().describe('Unique identifier of the budget'),
  name: z.string().nullable().optional().describe('Budget name'),
  description: z.string().nullable().optional().describe('Budget description'),
  status: z.string().optional().describe('Budget status'),
  periodType: z
    .string()
    .optional()
    .describe('Budget period: MONTHLY, QUARTERLY, YEARLY, ONE_TIME'),
  limit: z
    .object({
      amount: z.number().describe('Limit amount in cents'),
      currency: z.string().nullable().describe('Currency code')
    })
    .nullable()
    .optional()
    .describe('Spend limit for the budget'),
  currentPeriodBalance: z
    .object({
      amount: z.number().describe('Available balance in cents'),
      currency: z.string().nullable().describe('Currency code')
    })
    .nullable()
    .optional()
    .describe('Remaining balance for the current period')
});

export let listBudgets = SlateTool.create(spec, {
  name: 'List Budgets',
  key: 'list_budgets',
  description: `List budgets in your Brex account. Returns budget details including name, status, spend limits, and remaining balances for the current period.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor for fetching next page'),
      limit: z.number().optional().describe('Maximum number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      budgets: z.array(budgetSchema).describe('List of budgets'),
      nextCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listBudgets({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let budgets = result.items.map((b: any) => ({
      budgetId: b.id,
      name: b.name ?? null,
      description: b.description ?? null,
      status: b.budget_status ?? b.status,
      periodType: b.period_type,
      limit: b.limit ? { amount: b.limit.amount, currency: b.limit.currency } : null,
      currentPeriodBalance: b.current_period_balance
        ? {
            amount: b.current_period_balance.amount,
            currency: b.current_period_balance.currency
          }
        : null
    }));

    return {
      output: {
        budgets,
        nextCursor: result.next_cursor
      },
      message: `Found **${budgets.length}** budget(s).${result.next_cursor ? ' More results available.' : ''}`
    };
  })
  .build();
