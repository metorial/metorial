import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { spec } from '../spec';

export let manageCmsEntity = SlateTool.create(spec, {
  name: 'Manage CMS Entity',
  key: 'manage_cms_entity',
  description: `Create, update, or delete a CMS entity for a bot. CMS entities define the structure (fields) for a collection of content items. Use "create" to make a new entity with optional fields, "update" to rename an existing entity, or "delete" to remove it.`
})
  .input(
    z.object({
      botId: z.string().describe('ID of the bot'),
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      entityId: z
        .string()
        .optional()
        .describe('ID of the entity (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Name of the entity (required for create, optional for update)'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            dataType: z
              .enum([
                'text',
                'image',
                'date',
                'single_option',
                'multiple_options',
                'multiple_values',
                'entity'
              ])
              .describe('Field data type')
          })
        )
        .optional()
        .describe('Fields to define on the entity (only for create)'),
      env: z.enum(['draft', 'live']).optional().describe('Environment (draft or live)')
    })
  )
  .output(
    z.object({
      entityId: z.string().optional().describe('ID of the created/updated entity'),
      name: z.string().optional().describe('Name of the entity'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let { action, botId, entityId, name, fields, env } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Name is required when creating a CMS entity.');
      let entity = await client.createCmsEntity(botId, { name, fields }, env);
      return {
        output: {
          entityId: entity.id || entity._id || '',
          name: entity.name || name,
          success: true
        },
        message: `Created CMS entity **${name}**.`
      };
    }

    if (action === 'update') {
      if (!entityId) throw new Error('Entity ID is required for updating a CMS entity.');
      await client.updateCmsEntity(botId, entityId, { name }, env);
      return {
        output: {
          entityId,
          name,
          success: true
        },
        message: `Updated CMS entity **${entityId}**.`
      };
    }

    if (action === 'delete') {
      if (!entityId) throw new Error('Entity ID is required for deleting a CMS entity.');
      await client.deleteCmsEntity(botId, entityId, env);
      return {
        output: {
          entityId,
          success: true
        },
        message: `Deleted CMS entity **${entityId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
