import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapBudget } from '../lib/schemas';
import { spec } from '../spec';

let budgetSchema = z.object({
  budgetId: z.string().describe('Unique identifier of the budget'),
  name: z.string().nullable().optional().describe('Budget name'),
  description: z.string().nullable().optional().describe('Budget description'),
  status: z.string().nullish().describe('Budget status'),
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
  description: `List budgets or spend limits in your Brex account. Returns names, current status and the documented planned-spend or authorization amount.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['budget', 'spend_limit'])
        .optional()
        .describe(
          'Budgets track planned spend; spend limits enforce member spending controls. Defaults to budget.'
        ),
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
    const result = await new Client({ token: ctx.auth.token }).listBudgets(
      { cursor: ctx.input.cursor, limit: ctx.input.limit },
      ctx.input.resourceType
    );
    return {
      output: { budgets: result.items.map(mapBudget), nextCursor: result.next_cursor },
      message: `Returned ${result.items.length} spending resources.`
    };
  })
  .build();
