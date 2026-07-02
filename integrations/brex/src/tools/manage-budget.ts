import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBudget = SlateTool.create(spec, {
  name: 'Manage Budget',
  key: 'manage_budget',
  description: `Create, update, or archive a budget in Brex. Budgets control spending with configurable limits, members, and periods.
To create a budget, omit **budgetId**. To update, provide **budgetId**. To archive, set **archive** to true.`,
  instructions: [
    'To create a budget, omit budgetId and provide name and limit details.',
    'To update, provide budgetId and only the fields to change.',
    'Archiving a budget removes it from the UI and disables its spend limits. This cannot be undone.'
  ]
})
  .input(
    z.object({
      budgetId: z
        .string()
        .optional()
        .describe('ID of an existing budget to update or archive. Omit to create.'),
      archive: z.boolean().optional().describe('Set to true to archive the budget'),
      name: z.string().optional().describe('Name of the budget'),
      description: z.string().optional().describe('Description of the budget'),
      parentBudgetId: z.string().optional().describe('Parent budget ID for nested budgets'),
      ownerUserIds: z.array(z.string()).optional().describe('User IDs of the budget owners'),
      memberUserIds: z.array(z.string()).optional().describe('User IDs of the budget members'),
      periodType: z
        .enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'])
        .optional()
        .describe('Budget period type'),
      limit: z
        .object({
          amount: z.number().describe('Limit amount in cents'),
          currency: z.string().optional().describe('Currency code (defaults to USD)')
        })
        .optional()
        .describe('Spend limit for the budget'),
      startDate: z.string().optional().describe('Start date for the budget period (ISO 8601)'),
      endDate: z.string().optional().describe('End date for the budget period (ISO 8601)')
    })
  )
  .output(
    z.object({
      budgetId: z.string().describe('ID of the budget'),
      name: z.string().nullable().optional().describe('Budget name'),
      status: z.string().optional().describe('Budget status'),
      archived: z.boolean().optional().describe('Whether the budget was archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.budgetId && ctx.input.archive) {
      await client.archiveBudget(ctx.input.budgetId);
      return {
        output: {
          budgetId: ctx.input.budgetId,
          archived: true
        },
        message: `Budget **${ctx.input.budgetId}** archived.`
      };
    }

    let budget: any;
    let action: string;

    let buildBudgetData = () => {
      let data: Record<string, any> = {};
      if (ctx.input.name !== undefined) data.name = ctx.input.name;
      if (ctx.input.description !== undefined) data.description = ctx.input.description;
      if (ctx.input.parentBudgetId !== undefined)
        data.parent_budget_id = ctx.input.parentBudgetId;
      if (ctx.input.ownerUserIds !== undefined) data.owner_user_ids = ctx.input.ownerUserIds;
      if (ctx.input.memberUserIds !== undefined)
        data.member_user_ids = ctx.input.memberUserIds;
      if (ctx.input.periodType !== undefined) data.period_type = ctx.input.periodType;
      if (ctx.input.limit !== undefined) {
        data.limit = {
          amount: ctx.input.limit.amount,
          currency: ctx.input.limit.currency ?? 'USD'
        };
      }
      if (ctx.input.startDate !== undefined) data.start_date = ctx.input.startDate;
      if (ctx.input.endDate !== undefined) data.end_date = ctx.input.endDate;
      return data;
    };

    if (ctx.input.budgetId) {
      budget = await client.updateBudget(ctx.input.budgetId, buildBudgetData());
      action = 'updated';
    } else {
      budget = await client.createBudget(buildBudgetData());
      action = 'created';
    }

    return {
      output: {
        budgetId: budget.id,
        name: budget.name ?? null,
        status: budget.budget_status ?? budget.status,
        archived: false
      },
      message: `Budget **${budget.name || budget.id}** ${action}.`
    };
  })
  .build();
