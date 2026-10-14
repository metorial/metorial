import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { botIdSchema, botScopeGuidance, entityIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageCmsEntity = SlateTool.create(spec, {
  name: 'Manage CMS Entity',
  key: 'manage_cms_entity',
  tags: { destructive: true },
  description: `Create, update, or delete a CMS entity for a bot. CMS entities define the structure (fields) for a collection of content items. Use "create" to make a new entity with optional fields, "update" to rename an existing entity, or "delete" to remove it. ${botScopeGuidance}`
})
  .input(
    z.object({
      botId: botIdSchema,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      entityId: entityIdSchema
        .optional()
        .describe(
          'CMS entity ID, required for update/delete. Call list_cms_entities to discover it.'
        ),
      name: z
        .string()
        .optional()
        .describe('Name of the entity (required for create, optional for update)'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field display name'),
            uniqueName: z
              .string()
              .optional()
              .describe(
                'Stable field key used in item fieldValues; defaults to name for existing calls'
              ),
            options: z
              .record(z.string(), z.any())
              .optional()
              .describe(
                'Field options, such as predefined_data for choices or entity_id for entity references'
              ),
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
      env: z
        .enum(['draft', 'live'])
        .optional()
        .describe('Environment: draft changes only, or live to update both draft and live')
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
      if (!name) throw createApiServiceError('Name is required when creating a CMS entity.');
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
      if (!entityId)
        throw createApiServiceError('Entity ID is required for updating a CMS entity.');
      if (name === undefined)
        throw createApiServiceError('Provide a name when updating a CMS entity.');
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
      if (!entityId)
        throw createApiServiceError('Entity ID is required for deleting a CMS entity.');
      await client.deleteCmsEntity(botId, entityId, env);
      return {
        output: {
          entityId,
          success: true
        },
        message: `Deleted CMS entity **${entityId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
