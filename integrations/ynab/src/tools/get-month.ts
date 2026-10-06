import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapCategory, mapMonth } from '../lib/models';
import { budgetInput, milliunits } from '../lib/validation';
import { spec } from '../spec';

let monthCategorySchema = z.object({
  categoryId: z.string().describe('Category ID'),
  name: z.string().describe('Category name'),
  budgeted: milliunits.describe('Budgeted amount in milliunits'),
  activity: milliunits.describe('Activity in milliunits'),
  balance: milliunits.describe('Available balance in milliunits'),
  goalType: z.string().nullable().optional().describe('Goal type'),
  goalPercentageComplete: milliunits.nullable().optional().describe('Goal progress percentage')
});

export let getMonth = SlateTool.create(spec, {
  name: 'Get Budget Month',
  key: 'get_month',
  description: `Retrieve detailed budget data for a specific month, including income, total assigned, total activity, "Ready to Assign" amount, and per-category breakdowns. Use "current" for the current month.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      budgetId: budgetInput,
      month: z
        .string()
        .describe(
          'Month to retrieve (YYYY-MM-DD, first day of month, or "current" for the current month)'
        )
    })
  )
  .output(
    z.object({
      month: z.string().describe('Month (YYYY-MM-DD)'),
      income: milliunits.optional().describe('Total income in milliunits'),
      budgeted: milliunits.optional().describe('Total budgeted/assigned in milliunits'),
      activity: milliunits.optional().describe('Total activity in milliunits'),
      toBeBudgeted: milliunits.optional().describe('"Ready to Assign" amount in milliunits'),
      ageOfMoney: milliunits.nullable().optional().describe('Age of Money in days'),
      note: z.string().nullable().optional().describe('Month note'),
      categories: z.array(monthCategorySchema).optional().describe('Per-category breakdown')
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token }).getMonth(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.month
    );
    return {
      output: { ...mapMonth(data), categories: data.categories.map(mapCategory) },
      message: `Retrieved ${data.month}; Ready to Assign: ${data.to_be_budgeted} milliunits.`
    };
  })
  .build();
