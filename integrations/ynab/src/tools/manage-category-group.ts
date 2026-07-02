import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCategoryGroup = SlateTool.create(spec, {
  name: 'Manage Category Group',
  key: 'manage_category_group',
  description: `Create or rename a category group. Groups organize categories in the budget.`,
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
      action: z.enum(['create', 'update']).describe('Action to perform'),
      categoryGroupId: z
        .string()
        .optional()
        .describe('Category group ID (required for update)'),
      name: z.string().describe('Category group name')
    })
  )
  .output(
    z.object({
      categoryGroupId: z.string().describe('Category group ID'),
      name: z.string().describe('Category group name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;

    let group: any;
    if (ctx.input.action === 'create') {
      group = await client.createCategoryGroup(budgetId, { name: ctx.input.name });
    } else {
      if (!ctx.input.categoryGroupId) {
        throw new Error('categoryGroupId is required for update action');
      }
      group = await client.updateCategoryGroup(budgetId, ctx.input.categoryGroupId, {
        name: ctx.input.name
      });
    }

    return {
      output: {
        categoryGroupId: group.id,
        name: group.name
      },
      message: `${ctx.input.action === 'create' ? 'Created' : 'Updated'} category group **${group.name}**`
    };
  })
  .build();
