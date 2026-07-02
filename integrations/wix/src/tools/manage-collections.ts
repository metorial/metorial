import { SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageCollections = SlateTool.create(spec, {
  name: 'Manage Collections',
  key: 'manage_collections',
  description: `Query and retrieve product collections from a Wix Store.
Use **action** to specify the operation: \`list\` or \`get\`.
Collections are groups of products (categories) used to organize a store catalog.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      action: z.enum(['list', 'get']).describe('Operation to perform'),
      collectionId: z.string().optional().describe('Collection ID (required for get)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter object for list action'),
      sort: z
        .array(
          z.object({
            fieldName: z.string(),
            order: z.enum(['ASC', 'DESC'])
          })
        )
        .optional()
        .describe('Sort specification'),
      limit: z.number().optional().describe('Max items to return (default 100)'),
      offset: z.number().optional().describe('Number of items to skip')
    })
  )
  .output(
    z.object({
      collection: z.any().optional().describe('Single collection data'),
      collections: z.array(z.any()).optional().describe('List of collections'),
      totalResults: z.number().optional().describe('Total number of collections')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.queryCollections({
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          paging: { limit: ctx.input.limit, offset: ctx.input.offset }
        });
        let collections = result.collections || [];
        return {
          output: { collections, totalResults: result.totalResults },
          message: `Found **${collections.length}** collections`
        };
      }
      case 'get': {
        if (!ctx.input.collectionId)
          throw new Error('collectionId is required for get action');
        let result = await client.getCollection(ctx.input.collectionId);
        return {
          output: { collection: result.collection },
          message: `Retrieved collection **${result.collection?.name || ctx.input.collectionId}**`
        };
      }
    }
  })
  .build();
