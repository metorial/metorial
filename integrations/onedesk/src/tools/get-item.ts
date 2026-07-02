import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getItem = SlateTool.create(spec, {
  name: 'Get Work Item',
  key: 'get_item',
  description: `Retrieves a single work item by its internal ID or external ID.
Returns full details of the item including name, description, status, priority, assignees, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      itemId: z
        .string()
        .optional()
        .describe('Internal ID of the work item (shown in the OneDesk UI).'),
      externalId: z
        .string()
        .optional()
        .describe(
          'External ID of the work item. Use this if integrating with external systems.'
        )
    })
  )
  .output(
    z.object({
      item: z
        .record(z.string(), z.any())
        .describe(
          'Full work item details including name, type, status, priority, and custom fields.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    if (!ctx.input.itemId && !ctx.input.externalId) {
      throw new Error('Either itemId or externalId must be provided.');
    }

    let item: any;
    if (ctx.input.externalId) {
      item = await client.getItemByExternalId(ctx.input.externalId);
    } else {
      item = await client.getItemById(ctx.input.itemId!);
    }

    let itemName = item?.name || item?.id || 'Unknown';

    return {
      output: {
        item
      },
      message: `Retrieved work item **${itemName}**.`
    };
  })
  .build();
