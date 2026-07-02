import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateEntityTool = SlateTool.create(spec, {
  name: 'Update Entity',
  key: 'update_entity',
  description: `Update an existing entity (record) in any Type (database). Supports updating primitive fields, single-select fields, and relation fields. Only include the fields you want to change.`,
  instructions: [
    'Use "get_schema" to discover field names, and "query_entities" to find the entity ID.',
    'Only include fields you want to update — omitted fields remain unchanged.',
    'For single-select enum fields, provide {"fibery/id": "enum-value-uuid"}.',
    'For relation fields (one-to-one), provide {"fibery/id": "related-entity-uuid"}.',
    'For rich text fields, use the "manage_document" tool instead.',
    'For collection fields, use the "manage_collection" tool instead.'
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
      entityId: z.string().describe('The fibery/id of the entity to update'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Field values to update. Keys are fully qualified field names. Example: {"Project/Name": "Updated Name", "Project/Priority": 5}'
        )
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('The fibery/id of the updated entity'),
      entity: z
        .record(z.string(), z.any())
        .describe('The updated entity data returned by Fibery')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.accountName,
      token: ctx.auth.token
    });

    let entityData: Record<string, any> = {
      'fibery/id': ctx.input.entityId,
      ...ctx.input.fields
    };

    let result = await client.updateEntity(ctx.input.typeName, entityData);

    return {
      output: {
        entityId: ctx.input.entityId,
        entity: result
      },
      message: `Updated entity \`${ctx.input.entityId}\` of type **${ctx.input.typeName}**.`
    };
  })
  .build();
