import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapPlan } from '../lib/models';
import { milliunits } from '../lib/validation';
import { spec } from '../spec';

let budgetSchema = z.object({
  accounts: z
    .array(
      z.object({
        accountId: z.string(),
        name: z.string(),
        type: z.string(),
        onBudget: z.boolean(),
        closed: z.boolean(),
        balance: milliunits,
        clearedBalance: milliunits,
        unclearedBalance: milliunits,
        deleted: z.boolean()
      })
    )
    .optional()
    .describe('Account summaries when includeAccounts is true.'),
  budgetId: z.string().describe('Unique identifier for the budget'),
  name: z.string().describe('Name of the budget'),
  lastModifiedOn: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp of the last modification'),
  firstMonth: z.string().optional().describe('First month of the budget (YYYY-MM-DD)'),
  lastMonth: z.string().optional().describe('Last month of the budget (YYYY-MM-DD)'),
  dateFormat: z.string().optional().describe('Date format used in the budget'),
  currencyIsoCode: z.string().optional().describe('ISO currency code'),
  currencySymbol: z.string().optional().describe('Currency symbol')
});

export let listBudgets = SlateTool.create(spec, {
  name: 'List Budgets',
  key: 'list_budgets',
  description: `Retrieve all budgets belonging to the authenticated YNAB user. Returns budget names, IDs, date ranges, and format settings. Use the returned budget IDs for other YNAB operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeAccounts: z
        .boolean()
        .optional()
        .describe('Whether to include account summaries for each budget')
    })
  )
  .output(
    z.object({
      budgets: z.array(budgetSchema).describe('List of budgets')
    })
  )
  .handleInvocation(async ctx => {
    const budgets = await new Client({ token: ctx.auth.token }).getBudgets(
      ctx.input.includeAccounts
    );
    const mapped = budgets.map(mapPlan);
    return { output: { budgets: mapped }, message: `Found ${mapped.length} budget(s).` };
  })
  .build();
