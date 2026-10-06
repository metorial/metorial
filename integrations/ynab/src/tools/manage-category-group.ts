import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { budgetInput, idInput, invalid, rejectFields, required } from '../lib/validation';
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
      budgetId: budgetInput,
      action: z.enum(['create', 'update']).describe('Action to perform'),
      categoryGroupId: idInput.optional().describe('Category group ID (required for update)'),
      name: z.string().trim().min(1).max(50).describe('Category group name')
    })
  )
  .output(
    z.object({
      categoryGroupId: z.string().describe('Category group ID'),
      name: z.string().describe('Category group name')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const budget = ctx.input.budgetId ?? ctx.config.budgetId;
    const name = required(ctx.input.name, 'Category group name');
    let group: Awaited<ReturnType<Client['createCategoryGroup']>>;
    if (ctx.input.action === 'create') {
      rejectFields(ctx.input, ['categoryGroupId'], 'create');
      group = await client.createCategoryGroup(budget, { name });
    } else {
      const id = required(ctx.input.categoryGroupId, 'Category group ID');
      const current = (await client.getCategories(budget)).categoryGroups.find(
        g => g.id === id
      );
      if (!current || current.deleted || current.internal)
        throw invalid('Only an active, user-created category group can be renamed.');
      group = await client.updateCategoryGroup(budget, id, { name });
    }
    if (
      group.deleted ||
      (ctx.input.action === 'update' && group.id !== ctx.input.categoryGroupId) ||
      group.name !== name
    )
      throw createApiServiceError('YNAB did not confirm the requested category group.', {
        reason: 'ynab_response'
      });
    return {
      output: { categoryGroupId: group.id, name: group.name },
      message: `${ctx.input.action === 'create' ? 'Created' : 'Updated'} category group ${group.id}.`
    };
  })
  .build();
