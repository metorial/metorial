import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let searchCollections = SlateTool.create(spec, {
  name: 'Search Collections',
  key: 'search_collections',
  description: `Search across your Mem collections using a text query. Returns matching collections ranked by relevance.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Text query to search collections for.')
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
        .describe('Relevance-ranked list of matching collections.'),
      total: z.number().describe('Total number of matching collections.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let response = await client.searchCollections({
      query: ctx.input.query
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
        total: response.total
      },
      message: `Found **${response.total}** collection(s) matching the search.`
    };
  })
  .build();
