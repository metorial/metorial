import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let monthCategorySchema = z.object({
  categoryId: z.string().describe('Category ID'),
  name: z.string().describe('Category name'),
  budgeted: z.number().describe('Budgeted amount in milliunits'),
  activity: z.number().describe('Activity in milliunits'),
  balance: z.number().describe('Available balance in milliunits'),
  goalType: z.string().nullable().optional().describe('Goal type'),
  goalPercentageComplete: z.number().nullable().optional().describe('Goal progress percentage')
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
      budgetId: z
        .string()
        .optional()
        .describe('Budget ID. Defaults to the configured budget.'),
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
      income: z.number().optional().describe('Total income in milliunits'),
      budgeted: z.number().optional().describe('Total budgeted/assigned in milliunits'),
      activity: z.number().optional().describe('Total activity in milliunits'),
      toBeBudgeted: z.number().optional().describe('"Ready to Assign" amount in milliunits'),
      ageOfMoney: z.number().nullable().optional().describe('Age of Money in days'),
      note: z.string().nullable().optional().describe('Month note'),
      categories: z.array(monthCategorySchema).optional().describe('Per-category breakdown')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;

    let monthStr = ctx.input.month;
    if (monthStr === 'current') {
      let now = new Date();
      monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }

    let month = await client.getMonth(budgetId, monthStr);

    let categories = (month?.categories ?? []).map((c: any) => ({
      categoryId: c.id,
      name: c.name,
      budgeted: c.budgeted,
      activity: c.activity,
      balance: c.balance,
      goalType: c.goal_type,
      goalPercentageComplete: c.goal_percentage_complete
    }));

    return {
      output: {
        month: month?.month,
        income: month?.income,
        budgeted: month?.budgeted,
        activity: month?.activity,
        toBeBudgeted: month?.to_be_budgeted,
        ageOfMoney: month?.age_of_money,
        note: month?.note,
        categories
      },
      message: `Retrieved budget month **${month?.month}** — Ready to Assign: ${(month?.to_be_budgeted ?? 0) / 1000}`
    };
  })
  .build();
