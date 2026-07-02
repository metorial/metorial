import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.string().describe('Category ID'),
  categoryGroupId: z.string().describe('Category group ID'),
  categoryGroupName: z.string().optional().describe('Category group name'),
  name: z.string().describe('Category name'),
  hidden: z.boolean().describe('Whether hidden'),
  note: z.string().nullable().optional().describe('Category note'),
  budgeted: z.number().describe('Budgeted (assigned) amount in milliunits'),
  activity: z.number().describe('Activity amount in milliunits'),
  balance: z.number().describe('Available balance in milliunits'),
  goalType: z.string().nullable().optional().describe('Goal type: TB, TBD, MF, NEED, DEBT'),
  goalTarget: z.number().nullable().optional().describe('Goal target amount in milliunits'),
  goalTargetDate: z.string().nullable().optional().describe('Goal target date'),
  goalPercentageComplete: z
    .number()
    .nullable()
    .optional()
    .describe('Goal progress percentage'),
  goalUnderFunded: z
    .number()
    .nullable()
    .optional()
    .describe('Amount underfunded in milliunits'),
  deleted: z.boolean().describe('Whether deleted')
});

let categoryGroupSchema = z.object({
  categoryGroupId: z.string().describe('Category group ID'),
  name: z.string().describe('Category group name'),
  hidden: z.boolean().describe('Whether hidden'),
  deleted: z.boolean().describe('Whether deleted'),
  categories: z.array(categorySchema).describe('Categories in this group')
});

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve all category groups and their categories for a budget. Includes budgeted amounts, activity, available balances, and goal information.`,
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
      categoryGroups: z
        .array(categoryGroupSchema)
        .describe('Category groups with their categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;

    let { categoryGroups } = await client.getCategories(budgetId);

    let mapped = categoryGroups.map((g: any) => ({
      categoryGroupId: g.id,
      name: g.name,
      hidden: g.hidden,
      deleted: g.deleted,
      categories: (g.categories ?? []).map((c: any) => ({
        categoryId: c.id,
        categoryGroupId: c.category_group_id,
        categoryGroupName: c.category_group_name,
        name: c.name,
        hidden: c.hidden,
        note: c.note,
        budgeted: c.budgeted,
        activity: c.activity,
        balance: c.balance,
        goalType: c.goal_type,
        goalTarget: c.goal_target,
        goalTargetDate: c.goal_target_date,
        goalPercentageComplete: c.goal_percentage_complete,
        goalUnderFunded: c.goal_under_funded,
        deleted: c.deleted
      }))
    }));

    let totalCategories = mapped.reduce((sum: number, g: any) => sum + g.categories.length, 0);

    return {
      output: { categoryGroups: mapped },
      message: `Found **${mapped.length}** category group(s) with **${totalCategories}** total categories`
    };
  })
  .build();
