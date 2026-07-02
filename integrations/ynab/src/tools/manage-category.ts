import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCategory = SlateTool.create(spec, {
  name: 'Manage Category',
  key: 'manage_category',
  description: `Create, update, or assign budget amounts to categories. Use action "create" to create a new category within a group, "update" to rename or modify a category, or "assign" to set the budgeted amount for a category in a specific month.`,
  instructions: [
    'For "create": provide categoryGroupId and name',
    'For "update": provide categoryId and fields to change',
    'For "assign": provide categoryId, month, and budgeted amount in milliunits'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      budgetId: z
        .string()
        .optional()
        .describe('Budget ID. Defaults to the configured budget.'),
      action: z.enum(['create', 'update', 'assign']).describe('Action to perform'),
      categoryId: z.string().optional().describe('Category ID (required for update/assign)'),
      categoryGroupId: z
        .string()
        .optional()
        .describe('Category group ID (required for create)'),
      name: z.string().optional().describe('Category name (for create/update)'),
      note: z.string().nullable().optional().describe('Category note (for update)'),
      goalType: z
        .enum(['TB', 'TBD', 'MF', 'NEED', 'DEBT'])
        .nullable()
        .optional()
        .describe('Goal type (for update). Set to null to remove goal.'),
      goalTarget: z
        .number()
        .nullable()
        .optional()
        .describe('Goal target amount in milliunits (for update)'),
      goalTargetDate: z
        .string()
        .nullable()
        .optional()
        .describe('Goal target date YYYY-MM-DD (for update)'),
      goalDay: z.number().nullable().optional().describe('Goal day of month (for update)'),
      month: z.string().optional().describe('Month (YYYY-MM-DD) for assign action'),
      budgeted: z
        .number()
        .optional()
        .describe('Budgeted (assigned) amount in milliunits for assign action')
    })
  )
  .output(
    z.object({
      categoryId: z.string().describe('Category ID'),
      name: z.string().describe('Category name'),
      budgeted: z.number().optional().describe('Budgeted amount in milliunits'),
      activity: z.number().optional().describe('Activity in milliunits'),
      balance: z.number().optional().describe('Available balance in milliunits'),
      goalType: z.string().nullable().optional().describe('Goal type'),
      goalPercentageComplete: z
        .number()
        .nullable()
        .optional()
        .describe('Goal progress percentage')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;
    let action = ctx.input.action;

    let category: any;

    if (action === 'create') {
      if (!ctx.input.categoryGroupId || !ctx.input.name) {
        throw new Error('categoryGroupId and name are required for create action');
      }
      category = await client.createCategory(budgetId, {
        name: ctx.input.name,
        category_group_id: ctx.input.categoryGroupId
      });
    } else if (action === 'update') {
      if (!ctx.input.categoryId) {
        throw new Error('categoryId is required for update action');
      }
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.note !== undefined) updateData.note = ctx.input.note;
      if (ctx.input.goalType !== undefined) updateData.goal_type = ctx.input.goalType;
      if (ctx.input.goalTarget !== undefined) updateData.goal_target = ctx.input.goalTarget;
      if (ctx.input.goalTargetDate !== undefined)
        updateData.goal_target_month = ctx.input.goalTargetDate;
      if (ctx.input.goalDay !== undefined) updateData.goal_day = ctx.input.goalDay;

      category = await client.updateCategory(budgetId, ctx.input.categoryId, updateData);
    } else if (action === 'assign') {
      if (!ctx.input.categoryId || !ctx.input.month || ctx.input.budgeted === undefined) {
        throw new Error('categoryId, month, and budgeted are required for assign action');
      }
      category = await client.updateMonthCategory(
        budgetId,
        ctx.input.month,
        ctx.input.categoryId,
        ctx.input.budgeted
      );
    }

    return {
      output: {
        categoryId: category.id,
        name: category.name,
        budgeted: category.budgeted,
        activity: category.activity,
        balance: category.balance,
        goalType: category.goal_type,
        goalPercentageComplete: category.goal_percentage_complete
      },
      message: `${action === 'create' ? 'Created' : action === 'update' ? 'Updated' : 'Assigned budget to'} category **${category.name}**`
    };
  })
  .build();
