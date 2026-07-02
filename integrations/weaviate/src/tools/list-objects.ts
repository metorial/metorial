import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listObjects = SlateTool.create(spec, {
  name: 'List Objects',
  key: 'list_objects',
  description: `List objects from a collection using the REST API. Supports pagination via limit/offset or cursor-based pagination. Use this for simple object retrieval without search ranking; for search use the **Search Objects** tool instead.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of objects to return (default: 25)'),
      offset: z.number().optional().describe('Number of objects to skip'),
      after: z
        .string()
        .optional()
        .describe(
          'Cursor for cursor-based pagination (UUID of the last object from previous page)'
        ),
      includeVector: z.boolean().optional().describe('Include vector embeddings in results'),
      sort: z.string().optional().describe('Property name to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      tenant: z.string().optional().describe('Tenant name for multi-tenant collections')
    })
  )
  .output(
    z.object({
      objects: z
        .array(
          z.object({
            objectId: z.string().describe('Object UUID'),
            class: z.string().describe('Collection name'),
            properties: z.record(z.string(), z.any()).describe('Object properties'),
            vector: z.array(z.number()).optional().describe('Vector embedding'),
            creationTimeUnix: z.number().optional().describe('Creation timestamp'),
            lastUpdateTimeUnix: z.number().optional().describe('Last update timestamp')
          })
        )
        .describe('List of objects'),
      totalResults: z.number().describe('Number of objects returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { collectionName, limit, offset, after, includeVector, sort, order, tenant } =
      ctx.input;

    let include = includeVector ? 'vector' : undefined;

    let result = await client.listObjects({
      class: collectionName,
      limit,
      offset,
      after,
      include,
      sort,
      order,
      tenant
    });

    let objects = (result.objects || []).map((obj: any) => ({
      objectId: obj.id,
      class: obj.class,
      properties: obj.properties,
      vector: obj.vector,
      creationTimeUnix: obj.creationTimeUnix,
      lastUpdateTimeUnix: obj.lastUpdateTimeUnix
    }));

    return {
      output: {
        objects,
        totalResults: objects.length
      },
      message: `Listed **${objects.length}** object(s) from **${collectionName}**.`
    };
  })
  .build();
