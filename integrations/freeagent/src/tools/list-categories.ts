import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve the chart of accounts (categories) from FreeAgent. Returns Admin Expenses, Cost of Sales, Income, and General categories. Optionally include sub-accounts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subAccounts: z
        .boolean()
        .optional()
        .describe('Include sub-accounts instead of top-level accounts')
    })
  )
  .output(
    z.object({
      categories: z
        .record(z.string(), z.any())
        .describe(
          'Categories grouped by type (admin_expenses_categories, cost_of_sales_categories, income_categories, general_categories)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let categories = await client.listCategories(ctx.input);

    return {
      output: { categories },
      message: `Retrieved chart of accounts${ctx.input.subAccounts ? ' (with sub-accounts)' : ''}.`
    };
  })
  .build();
