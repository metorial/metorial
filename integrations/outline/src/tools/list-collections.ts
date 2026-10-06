import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { collectionOutput, mapCollection, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';
export const listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description:
    'List one page of authorized collections. Use pagination offset and limit to continue; total counts this page only.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe('Maximum number of collections to return'),
      offset: z.number().int().min(0).optional().default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      collections: z.array(collectionOutput),
      total: z.number().describe('Number of records on this page'),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    const result = await client.listCollections(ctx.input);
    const collections = result.data.map(mapCollection);
    return {
      output: { collections, total: collections.length, pagination: result.pagination },
      message: `Returned ${collections.length} collections on this page.`
    };
  })
  .build();
