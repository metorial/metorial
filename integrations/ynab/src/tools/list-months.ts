import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let monthSummarySchema = z.object({
  month: z.string().describe('Month (YYYY-MM-DD)'),
  income: z.number().optional().describe('Total income in milliunits'),
  budgeted: z.number().optional().describe('Total budgeted in milliunits'),
  activity: z.number().optional().describe('Total activity in milliunits'),
  toBeBudgeted: z.number().optional().describe('"Ready to Assign" amount in milliunits'),
  ageOfMoney: z.number().nullable().optional().describe('Age of Money in days'),
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
      budgetId: z.string().optional().describe('Budget ID. Defaults to the configured budget.')
    })
  )
  .output(
    z.object({
      months: z.array(monthSummarySchema).describe('Monthly budget summaries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;

    let { months } = await client.getMonths(budgetId);

    let mapped = months.map((m: any) => ({
      month: m.month,
      income: m.income,
      budgeted: m.budgeted,
      activity: m.activity,
      toBeBudgeted: m.to_be_budgeted,
      ageOfMoney: m.age_of_money,
      note: m.note,
      deleted: m.deleted
    }));

    return {
      output: { months: mapped },
      message: `Found **${mapped.length}** budget month(s)`
    };
  })
  .build();
