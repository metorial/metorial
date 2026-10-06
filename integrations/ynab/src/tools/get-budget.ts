import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapPlan } from '../lib/models';
import { budgetInput, deltaInput, milliunits } from '../lib/validation';
import { spec } from '../spec';

export let getBudget = SlateTool.create(spec, {
  name: 'Get Budget',
  key: 'get_budget',
  description: `Retrieve detailed information about a specific budget, including date/currency format, summary, and provider budget records for delta merging. Use "last-used" or "default" as shortcuts for the budget ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lastKnowledgeOfServer: deltaInput,
      budgetId: budgetInput
    })
  )
  .output(
    z.object({
      budgetData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Provider budget records for a full snapshot or delta merge. Monetary values remain integer milliunits.'
        ),
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
      serverKnowledge: milliunits
        .nonnegative()
        .optional()
        .describe('Server knowledge value for delta requests')
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token }).getBudget(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.lastKnowledgeOfServer
    );
    return {
      output: {
        ...mapPlan(data.budget),
        budgetData: data.budget,
        serverKnowledge: data.server_knowledge
      },
      message: 'Retrieved budget summary and sync knowledge.'
    };
  })
  .build();
