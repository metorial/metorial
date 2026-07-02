import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBudget = SlateTool.create(spec, {
  name: 'Get Budget',
  key: 'get_budget',
  description: `Retrieve detailed information about a specific budget, including its settings, date/currency format, and summary. Use "last-used" or "default" as shortcuts for the budget ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      budgetId: z
        .string()
        .optional()
        .describe(
          'Budget ID. Defaults to the configured budget. Use "last-used" or "default" as shortcuts.'
        )
    })
  )
  .output(
    z.object({
      budgetId: z.string().describe('Budget unique identifier'),
      name: z.string().describe('Budget name'),
      lastModifiedOn: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp of last modification'),
      firstMonth: z.string().optional().describe('First budget month'),
      lastMonth: z.string().optional().describe('Last budget month'),
      dateFormat: z.string().optional().describe('Date format string'),
      currencyIsoCode: z.string().optional().describe('ISO currency code'),
      currencySymbol: z.string().optional().describe('Currency symbol'),
      serverKnowledge: z
        .number()
        .optional()
        .describe('Server knowledge value for delta requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;
    let data = await client.getBudget(budgetId);
    let budget = data?.budget;

    return {
      output: {
        budgetId: budget?.id,
        name: budget?.name,
        lastModifiedOn: budget?.last_modified_on,
        firstMonth: budget?.first_month,
        lastMonth: budget?.last_month,
        dateFormat: budget?.date_format?.format,
        currencyIsoCode: budget?.currency_format?.iso_code,
        currencySymbol: budget?.currency_format?.currency_symbol,
        serverKnowledge: data?.server_knowledge
      },
      message: `Retrieved budget **${budget?.name}**`
    };
  })
  .build();
