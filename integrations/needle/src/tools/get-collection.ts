import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let getCollection = SlateTool.create(spec, {
  name: 'Get Collection',
  key: 'get_collection',
  description: `Retrieve details and statistics for a specific collection, including file counts, chunk counts, character counts, and indexing status breakdown.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('ID of the collection to retrieve')
    })
  )
  .output(
    z.object({
      collectionId: z.string().describe('Unique identifier of the collection'),
      name: z.string().describe('Name of the collection'),
      createdAt: z.string().describe('ISO timestamp when the collection was created'),
      searchQueries: z.number().describe('Number of search queries performed'),
      stats: z
        .object({
          users: z.number().describe('Number of users with access'),
          chunksCount: z.number().describe('Total number of indexed chunks'),
          characters: z.number().describe('Total number of characters across all files'),
          dataStats: z
            .array(
              z.object({
                status: z.string().describe('File indexing status (pending, indexed, error)'),
                count: z.number().describe('Number of files with this status'),
                size: z.number().describe('Total size of files with this status')
              })
            )
            .describe('Breakdown of file statuses')
        })
        .describe('Collection statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    let [collection, stats] = await Promise.all([
      client.getCollection(ctx.input.collectionId),
      client.getCollectionStats(ctx.input.collectionId)
    ]);

    return {
      output: {
        collectionId: collection.id,
        name: collection.name,
        createdAt: collection.created_at,
        searchQueries: collection.search_queries,
        stats: {
          users: stats.users,
          chunksCount: stats.chunks_count,
          characters: stats.characters,
          dataStats: stats.data_stats.map(d => ({
            status: d.status,
            count: d.count,
            size: d.size
          }))
        }
      },
      message: `Collection **${collection.name}** has ${stats.chunks_count} chunks and ${stats.characters} characters.`
    };
  })
  .build();
