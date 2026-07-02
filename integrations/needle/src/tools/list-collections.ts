import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List all document collections accessible to the authenticated user. Returns each collection's name, ID, creation date, and search query count.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Unique identifier of the collection'),
            name: z.string().describe('Name of the collection'),
            createdAt: z.string().describe('ISO timestamp when the collection was created'),
            searchQueries: z
              .number()
              .describe('Number of search queries performed on this collection')
          })
        )
        .describe('List of collections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    let collections = await client.listCollections();

    let mapped = collections.map(c => ({
      collectionId: c.id,
      name: c.name,
      createdAt: c.created_at,
      searchQueries: c.search_queries
    }));

    return {
      output: { collections: mapped },
      message: `Found **${mapped.length}** collection(s).`
    };
  })
  .build();
