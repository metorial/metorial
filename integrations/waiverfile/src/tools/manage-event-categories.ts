import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let manageEventCategories = SlateTool.create(spec, {
  name: 'Manage Event Categories',
  key: 'manage_event_categories',
  description: `List, create, update, or delete event categories in WaiverFile. Event categories help organize events into logical groupings. Use the "action" field to specify which operation to perform.`,
  instructions: [
    'Use action "list" to retrieve all event categories.',
    'Use action "create" to create a new category (requires "name").',
    'Use action "update" to rename or toggle a category (requires "eventCategoryId" and "name").',
    'Use action "delete" to remove a category (requires "eventCategoryId").'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      eventCategoryId: z
        .string()
        .optional()
        .describe('Category ID (required for update and delete)'),
      name: z.string().optional().describe('Category name (required for create and update)'),
      active: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether the category is active (for create and update)'),
      includeDisabled: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include disabled categories when listing')
    })
  )
  .output(
    z.object({
      categories: z.any().optional().describe('Array of event categories (for list action)'),
      category: z
        .any()
        .optional()
        .describe('Created or updated category (for create/update action)'),
      result: z.any().optional().describe('Operation result (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient({
      token: ctx.auth.token,
      siteId: ctx.auth.siteId
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let categories = await client.getEventCategories(ctx.input.includeDisabled);
      let results = Array.isArray(categories) ? categories : [categories];
      return {
        output: { categories: results },
        message: `Retrieved **${results.length}** event category/categories.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Category name is required for create action.');
      let category = await client.insertEventCategory({
        name: ctx.input.name,
        active: ctx.input.active ?? true
      });
      return {
        output: { category },
        message: `Created event category **${ctx.input.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.eventCategoryId)
        throw new Error('eventCategoryId is required for update action.');
      if (!ctx.input.name) throw new Error('Category name is required for update action.');
      let category = await client.updateEventCategory({
        eventCategoryId: ctx.input.eventCategoryId,
        name: ctx.input.name,
        active: ctx.input.active ?? true
      });
      return {
        output: { category },
        message: `Updated event category **${ctx.input.name}** (${ctx.input.eventCategoryId}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.eventCategoryId)
        throw new Error('eventCategoryId is required for delete action.');
      let result = await client.deleteEventCategory(ctx.input.eventCategoryId);
      return {
        output: { result },
        message: `Deleted event category **${ctx.input.eventCategoryId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
