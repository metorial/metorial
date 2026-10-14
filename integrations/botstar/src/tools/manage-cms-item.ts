import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { botIdSchema, botScopeGuidance, entityIdSchema, itemIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageCmsItem = SlateTool.create(spec, {
  name: 'Manage CMS Item',
  key: 'manage_cms_item',
  tags: { destructive: true },
  description: `Create, update, or delete a CMS item within an entity. Items are data objects with field values defined by their parent entity's schema. Use "create" to add a new item, "update" to modify an existing item's fields, or "delete" to remove it. ${botScopeGuidance}`
})
  .input(
    z.object({
      botId: botIdSchema,
      entityId: entityIdSchema,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      itemId: itemIdSchema
        .optional()
        .describe(
          'CMS item ID, required for update/delete. Call list_cms_items to discover it.'
        ),
      name: z.string().optional().describe('Name of the item'),
      status: z.enum(['enabled', 'disabled']).optional().describe('Status of the item'),
      fieldValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field values to set as key-value pairs'),
      env: z
        .enum(['draft', 'live'])
        .optional()
        .describe('Environment: draft changes only, or live to update both draft and live')
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
      if (fieldValues) body = { ...fieldValues, ...body };

      if (typeof body.name !== 'string' || !body.name.trim())
        throw createApiServiceError('A name is required when creating a CMS item.');
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
      if (!itemId) throw createApiServiceError('Item ID is required for updating a CMS item.');
      let body: Record<string, any> = {};
      if (name !== undefined) body.name = name;
      if (status !== undefined) body.status = status;
      if (fieldValues) body = { ...fieldValues, ...body };

      if (Object.keys(body).length === 0)
        throw createApiServiceError(
          'Provide a name, status, or fieldValues when updating a CMS item.'
        );
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
      if (!itemId) throw createApiServiceError('Item ID is required for deleting a CMS item.');
      await client.deleteCmsEntityItem(botId, entityId, itemId, env);
      return {
        output: {
          itemId,
          success: true
        },
        message: `Deleted CMS item **${itemId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
