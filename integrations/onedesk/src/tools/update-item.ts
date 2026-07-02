import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateItem = SlateTool.create(spec, {
  name: 'Update Work Item',
  key: 'update_item',
  description: `Updates an existing work item in OneDesk by its internal ID.
Modify the name, description, priority, or completion percentage of a ticket, task, or other item type.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      itemId: z.string().describe('Internal ID of the work item to update.'),
      name: z.string().optional().describe('New name/title for the work item.'),
      description: z
        .string()
        .optional()
        .describe('New description for the work item. Supports HTML.'),
      priority: z
        .number()
        .optional()
        .describe(
          'New priority level (0=No priority, 20=1-star, 40=2-star, 60=3-star, 80=4-star, 100=5-star).'
        ),
      percentComplete: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Completion percentage (0-100).')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the updated work item.'),
      updated: z.boolean().describe('Whether the update was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.priority !== undefined) updateData.priority = ctx.input.priority;
    if (ctx.input.percentComplete !== undefined)
      updateData.percentComplete = ctx.input.percentComplete;

    await client.updateItemById(ctx.input.itemId, updateData);

    return {
      output: {
        itemId: ctx.input.itemId,
        updated: true
      },
      message: `Updated work item \`${ctx.input.itemId}\` successfully.`
    };
  })
  .build();
