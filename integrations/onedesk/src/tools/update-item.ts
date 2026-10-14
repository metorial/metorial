import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validatePriority } from '../lib/client';
import { spec } from '../spec';

export let updateItem = SlateTool.create(spec, {
  name: 'Update Work Item',
  key: 'update_item',
  description: `Updates an existing work item in OneDesk by its numeric internal ID or external ID. External ID lookup requires an API key connection.
Modify the name, description, priority, or completion percentage of a ticket, task, or other item type.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      itemId: z
        .string()
        .optional()
        .describe(
          'Numeric internal ID of the work item to update. Provide this or externalId.'
        ),
      externalId: z
        .string()
        .optional()
        .describe(
          'External ID returned by create_item or search_items. Provide this or itemId; requires an API key connection.'
        ),
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

    if (
      (!ctx.input.itemId && !ctx.input.externalId) ||
      (ctx.input.itemId && ctx.input.externalId)
    ) {
      throw createApiServiceError('Provide exactly one of itemId or externalId.', {
        reason: 'invalid_input'
      });
    }
    validatePriority(ctx.input.priority);
    if (
      ctx.input.percentComplete !== undefined &&
      !Number.isInteger(ctx.input.percentComplete)
    ) {
      throw createApiServiceError(
        'Completion percentage must be a whole number from 0 to 100.',
        { reason: 'invalid_input' }
      );
    }
    let updateData = pickDefined({
      name: ctx.input.name,
      description: ctx.input.description,
      priority: ctx.input.priority,
      percentComplete: ctx.input.percentComplete
    });
    if (Object.keys(updateData).length === 0) {
      throw createApiServiceError('Provide at least one field to update.', {
        reason: 'invalid_input'
      });
    }

    let itemId = ctx.input.externalId ?? ctx.input.itemId!;
    if (ctx.input.externalId) {
      await client.updateItemByExternalId(ctx.input.externalId, updateData);
    } else {
      await client.updateItemById(itemId, updateData);
    }

    return {
      output: {
        itemId,
        updated: true
      },
      message: `Updated work item \`${itemId}\` successfully.`
    };
  })
  .build();
