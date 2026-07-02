import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateObject = SlateTool.create(spec, {
  name: 'Update Object',
  key: 'update_object',
  description: `Update an existing object's properties in a collection. Use **replaceAll** mode to replace all properties (PUT), or **patch** mode to merge only the provided properties (PATCH).`,
  instructions: [
    'Use replaceAll=true to replace the entire object properties (omitted properties will be removed).',
    'Use replaceAll=false (default) to only update the specified properties while keeping others unchanged.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      objectId: z.string().describe('UUID of the object to update'),
      properties: z.record(z.string(), z.any()).describe('Properties to update'),
      vector: z.array(z.number()).optional().describe('Updated vector embedding'),
      tenant: z.string().optional().describe('Tenant name for multi-tenant collections'),
      replaceAll: z
        .boolean()
        .optional()
        .describe(
          'If true, replaces all properties (PUT). If false, merges properties (PATCH). Defaults to false.'
        )
    })
  )
  .output(
    z.object({
      objectId: z.string().describe('UUID of the updated object'),
      class: z.string().describe('Collection name'),
      updated: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { collectionName, objectId, properties, vector, tenant, replaceAll } = ctx.input;

    if (replaceAll) {
      await client.updateObject(collectionName, objectId, {
        class: collectionName,
        properties,
        vector,
        tenant
      });
    } else {
      await client.patchObject(collectionName, objectId, {
        class: collectionName,
        properties,
        tenant
      });
    }

    return {
      output: {
        objectId,
        class: collectionName,
        updated: true
      },
      message: `Updated object **${objectId}** in **${collectionName}** using ${replaceAll ? 'full replace' : 'patch'} mode.`
    };
  })
  .build();
