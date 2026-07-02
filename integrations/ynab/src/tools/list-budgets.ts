import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let budgetSchema = z.object({
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
    let client = new Client({ token: ctx.auth.token });
    let budgets = await client.getBudgets(ctx.input.includeAccounts);

    let mapped = budgets.map((b: any) => ({
      budgetId: b.id,
      name: b.name,
      lastModifiedOn: b.last_modified_on,
      firstMonth: b.first_month,
      lastMonth: b.last_month,
      dateFormat: b.date_format?.format,
      currencyIsoCode: b.currency_format?.iso_code,
      currencySymbol: b.currency_format?.currency_symbol
    }));

    return {
      output: { budgets: mapped },
      message: `Found **${mapped.length}** budget(s): ${mapped.map((b: any) => b.name).join(', ')}`
    };
  })
  .build();
