import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEntityTool = SlateTool.create(spec, {
  name: 'Create Entity',
  key: 'create_entity',
  description: `Create a new entity (record) in any Type (database) in the Fibery workspace. Supports setting primitive fields, single-select fields (via their fibery/id), and relation fields. Rich text and collection fields must be updated separately after creation.`,
  instructions: [
    'Use "get_schema" first to discover available types and field names.',
    'Field names must be fully qualified (e.g., "Project/Name").',
    'For single-select enum fields, provide the value as {"fibery/id": "enum-value-uuid"}.',
    'For relation fields (one-to-one), provide {"fibery/id": "related-entity-uuid"}.',
    'Rich text (document) fields cannot be set during creation — use "manage_document" after.',
    'Collection (many-to-many) fields cannot be set during creation — use "manage_collection" after.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      typeName: z
        .string()
        .describe('Fully qualified type name (e.g., "Project Management/Task")'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Field values to set. Keys are fully qualified field names, values are the field data. Example: {"Project/Name": "My Task", "Project/Priority": 1}'
        ),
      entityId: z
        .string()
        .optional()
        .describe('Optional UUID for the entity. Auto-generated if not provided.')
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('The fibery/id of the created entity'),
      entity: z
        .record(z.string(), z.any())
        .describe('The created entity data returned by Fibery')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.accountName,
      token: ctx.auth.token
    });

    let entityData: Record<string, any> = { ...ctx.input.fields };
    if (ctx.input.entityId) {
      entityData['fibery/id'] = ctx.input.entityId;
    }

    let result = await client.createEntity(ctx.input.typeName, entityData);
    let entityId = result?.['fibery/id'] || ctx.input.entityId || 'unknown';

    return {
      output: {
        entityId,
        entity: result
      },
      message: `Created entity of type **${ctx.input.typeName}** with ID \`${entityId}\`.`
    };
  })
  .build();
