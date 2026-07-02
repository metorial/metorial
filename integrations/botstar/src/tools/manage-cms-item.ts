import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { spec } from '../spec';

export let manageCmsItem = SlateTool.create(spec, {
  name: 'Manage CMS Item',
  key: 'manage_cms_item',
  description: `Create, update, or delete a CMS item within an entity. Items are data objects with field values defined by their parent entity's schema. Use "create" to add a new item, "update" to modify an existing item's fields, or "delete" to remove it.`
})
  .input(
    z.object({
      botId: z.string().describe('ID of the bot'),
      entityId: z.string().describe('ID of the CMS entity'),
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      itemId: z
        .string()
        .optional()
        .describe('ID of the item (required for update and delete)'),
      name: z.string().optional().describe('Name of the item'),
      status: z.enum(['enabled', 'disabled']).optional().describe('Status of the item'),
      fieldValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field values to set as key-value pairs'),
      env: z.enum(['draft', 'live']).optional().describe('Environment (draft or live)')
    })
  )
  .output(
    z.object({
      itemId: z.string().optional().describe('ID of the created/updated item'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let { action, botId, entityId, itemId, name, status, fieldValues, env } = ctx.input;

    if (action === 'create') {
      let body: Record<string, any> = {};
      if (name !== undefined) body.name = name;
      if (status !== undefined) body.status = status;
      if (fieldValues) Object.assign(body, fieldValues);

      let result = await client.createCmsEntityItem(botId, entityId, body, env);
      return {
        output: {
          itemId: result.id || result._id || '',
          success: true
        },
        message: `Created CMS item${name ? ` **${name}**` : ''} in entity **${entityId}**.`
      };
    }

    if (action === 'update') {
      if (!itemId) throw new Error('Item ID is required for updating a CMS item.');
      let body: Record<string, any> = {};
      if (name !== undefined) body.name = name;
      if (status !== undefined) body.status = status;
      if (fieldValues) Object.assign(body, fieldValues);

      await client.updateCmsEntityItem(botId, entityId, itemId, body, env);
      return {
        output: {
          itemId,
          success: true
        },
        message: `Updated CMS item **${itemId}**.`
      };
    }

    if (action === 'delete') {
      if (!itemId) throw new Error('Item ID is required for deleting a CMS item.');
      await client.deleteCmsEntityItem(botId, entityId, itemId, env);
      return {
        output: {
          itemId,
          success: true
        },
        message: `Deleted CMS item **${itemId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
