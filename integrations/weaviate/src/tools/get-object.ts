import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getObject = SlateTool.create(spec, {
  name: 'Get Object',
  key: 'get_object',
  description: `Retrieve a specific object from a collection by its UUID. Optionally include the vector embedding and classification info in the response.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      objectId: z.string().describe('UUID of the object to retrieve'),
      includeVector: z
        .boolean()
        .optional()
        .describe('Whether to include the vector embedding in the response'),
      tenant: z.string().optional().describe('Tenant name for multi-tenant collections')
    })
  )
  .output(
    z
      .object({
        objectId: z.string().describe('UUID of the object'),
        class: z.string().describe('Collection name'),
        properties: z.record(z.string(), z.any()).describe('Object property values'),
        vector: z.array(z.number()).optional().describe('Vector embedding if requested'),
        creationTimeUnix: z.number().optional().describe('Creation timestamp'),
        lastUpdateTimeUnix: z.number().optional().describe('Last update timestamp')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let include = ctx.input.includeVector ? 'vector' : undefined;
    let result = await client.getObject(ctx.input.collectionName, ctx.input.objectId, {
      include,
      tenant: ctx.input.tenant
    });
    return {
      output: {
        objectId: result.id,
        class: result.class,
        properties: result.properties,
        vector: result.vector,
        creationTimeUnix: result.creationTimeUnix,
        lastUpdateTimeUnix: result.lastUpdateTimeUnix
      },
      message: `Retrieved object **${ctx.input.objectId}** from **${ctx.input.collectionName}**.`
    };
  })
  .build();
