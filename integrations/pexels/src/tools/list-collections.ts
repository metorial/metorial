import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { collectionSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `Browse Pexels collections. Can list either **featured** collections curated by Pexels, or **your own** personal collections. Collections group photos and videos into themed galleries.`,
  constraints: [
    'Rate limited to 200 requests per hour.',
    'Maximum 80 results per page.',
    'Collections cannot be created or modified via the API.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      source: z
        .enum(['featured', 'personal'])
        .describe(
          'Whether to list Pexels-featured collections or your own personal collections'
        ),
      page: z.number().optional().describe('Page number. Default: 1'),
      perPage: z.number().optional().describe('Results per page. Default: 15, Max: 80')
    })
  )
  .output(
    z.object({
      collections: z.array(collectionSchema).describe('List of collections'),
      pagination: paginationSchema.describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result =
      ctx.input.source === 'featured'
        ? await client.getFeaturedCollections({
            page: ctx.input.page,
            perPage: ctx.input.perPage
          })
        : await client.getMyCollections({ page: ctx.input.page, perPage: ctx.input.perPage });

    return {
      output: result,
      message: `Retrieved **${result.collections.length}** ${ctx.input.source} collections (page ${result.pagination.page}).`
    };
  })
  .build();
