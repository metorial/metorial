import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapCategory } from '../lib/models';
import { budgetInput, deltaInput, milliunits } from '../lib/validation';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.string().describe('Category ID'),
  categoryGroupId: z.string().describe('Category group ID'),
  categoryGroupName: z.string().optional().describe('Category group name'),
  name: z.string().describe('Category name'),
  internal: z
    .boolean()
    .optional()
    .describe('Whether this resource is used internally by YNAB.'),
  hidden: z.boolean().describe('Whether hidden'),
  note: z.string().nullable().optional().describe('Category note'),
  budgeted: milliunits.describe('Budgeted (assigned) amount in milliunits'),
  activity: milliunits.describe('Activity amount in milliunits'),
  balance: milliunits.describe('Available balance in milliunits'),
  goalNeedsWholeAmount: z
    .boolean()
    .nullable()
    .optional()
    .describe('NEED target rollover behavior.'),
  goalCadence: milliunits
    .nullable()
    .optional()
    .describe('Provider target cadence; monthly=1, weekly=2, yearly=13.'),
  goalType: z.string().nullable().optional().describe('Goal type: TB, TBD, MF, NEED, DEBT'),
  goalTarget: milliunits.nullable().optional().describe('Goal target amount in milliunits'),
  goalTargetDate: z.string().nullable().optional().describe('Goal target date'),
  goalPercentageComplete: milliunits
    .nullable()
    .optional()
    .describe('Goal progress percentage'),
  goalUnderFunded: milliunits
    .nullable()
    .optional()
    .describe('Amount underfunded in milliunits'),
  deleted: z.boolean().describe('Whether deleted')
});

let categoryGroupSchema = z.object({
  categoryGroupId: z.string().describe('Category group ID'),
  name: z.string().describe('Category group name'),
  internal: z
    .boolean()
    .optional()
    .describe('Whether this resource is used internally by YNAB.'),
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
      categoryGroups: z
        .array(categoryGroupSchema)
        .describe('Category groups with their categories')
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token }).getCategories(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.lastKnowledgeOfServer
    );
    const categoryGroups = data.categoryGroups.map(g => ({
      categoryGroupId: g.id,
      name: g.name,
      hidden: g.hidden,
      internal: g.internal,
      deleted: g.deleted,
      categories: g.categories.map(mapCategory)
    }));
    return {
      output: { categoryGroups, serverKnowledge: data.serverKnowledge },
      message: `Returned ${categoryGroups.length} category group record(s).`
    };
  })
  .build();
