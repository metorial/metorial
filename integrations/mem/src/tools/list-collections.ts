import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List collections from your Mem knowledge base with optional sorting and pagination.`,
  instructions: [
    'Use the "page" field with the "nextPage" value from a previous response to paginate through results.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of collections to return (default: 50).'),
      page: z
        .string()
        .optional()
        .describe('Opaque cursor from a previous response for pagination.'),
      orderBy: z
        .enum(['created_at', 'updated_at'])
        .optional()
        .describe('Sort order field (default: updated_at).')
    })
  )
  .output(
    z.object({
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Unique ID of the collection.'),
            title: z.string().describe('Title of the collection.'),
            description: z.string().nullable().describe('Description of the collection.'),
            createdAt: z.string().describe('Creation timestamp in ISO 8601 format.'),
            updatedAt: z.string().describe('Last updated timestamp in ISO 8601 format.')
          })
        )
        .describe('List of collections.'),
      total: z.number().describe('Total number of collections.'),
      nextPage: z
        .string()
        .nullable()
        .describe('Cursor for fetching the next page of results (null if no more pages).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let response = await client.listCollections({
      limit: ctx.input.limit,
      page: ctx.input.page,
      orderBy: ctx.input.orderBy
    });

    let collections = response.results.map(collection => ({
      collectionId: collection.id,
      title: collection.title,
      description: collection.description,
      createdAt: collection.created_at,
      updatedAt: collection.updated_at
    }));

    return {
      output: {
        collections,
        total: response.total,
        nextPage: response.next_page
      },
      message: `Found **${response.total}** collection(s). Returned **${collections.length}** in this page.`
    };
  })
  .build();
