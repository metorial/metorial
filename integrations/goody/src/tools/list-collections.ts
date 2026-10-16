import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGoodyClient } from '../lib/client';
import { collectionSchema, mapCollection } from '../lib/schemas';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description:
    'Find curated gift collections and the product IDs used to send them. Published collections let recipients choose from their included products.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number starting at 1'),
      perPage: z.number().optional().describe('Items per page from 1 to 100; defaults to 20'),
      published: z
        .boolean()
        .optional()
        .describe('Set true to return only published collections')
    })
  )
  .output(
    z.object({
      collections: z.array(collectionSchema).describe('Collections on this page'),
      totalCount: z.number().describe('Total number of matching collections')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createGoodyClient(ctx).listCollections(ctx.input);
    let collections = (result.data ?? []).map(mapCollection);
    return {
      output: { collections, totalCount: result.list_meta?.total_count ?? collections.length },
      message: `Returned **${collections.length}** collection(s) on this page.`
    };
  })
  .build();
