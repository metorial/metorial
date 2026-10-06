import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapMonth } from '../lib/models';
import { budgetInput, deltaInput, milliunits } from '../lib/validation';
import { spec } from '../spec';

let monthSummarySchema = z.object({
  month: z.string().describe('Month (YYYY-MM-DD)'),
  income: milliunits.optional().describe('Total income in milliunits'),
  budgeted: milliunits.optional().describe('Total budgeted in milliunits'),
  activity: milliunits.optional().describe('Total activity in milliunits'),
  toBeBudgeted: milliunits.optional().describe('"Ready to Assign" amount in milliunits'),
  ageOfMoney: milliunits.nullable().optional().describe('Age of Money in days'),
  note: z.string().nullable().optional().describe('Month note'),
  deleted: z.boolean().optional().describe('Whether deleted')
});

export let listMonths = SlateTool.create(spec, {
  name: 'List Budget Months',
  key: 'list_months',
  description: `Retrieve all budget months with summary data including income, assigned, activity, "Ready to Assign", and Age of Money.`,
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
      serverKnowledge: milliunits
        .nonnegative()
        .optional()
        .describe('Knowledge returned by this endpoint for subsequent delta requests.'),
      months: z.array(monthSummarySchema).describe('Monthly budget summaries')
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token }).getMonths(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.lastKnowledgeOfServer
    );
    return {
      output: { months: data.months.map(mapMonth), serverKnowledge: data.serverKnowledge },
      message: `Returned ${data.months.length} budget month record(s).`
    };
  })
  .build();
