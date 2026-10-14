import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let getCollectionStats = SlateTool.create(spec, {
  name: 'Get Collection Statistics',
  key: 'get_collection_stats',
  description:
    'Retrieve collection indexing statistics, including file counts, byte sizes, indexed chunks, characters, and users. Unknown byte sizes are returned as null.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      collectionId: z
        .string()
        .describe('Collection ID. Call list_collections to discover accessible collections.')
    })
  )
  .output(
    z.object({
      collectionId: z.string(),
      users: z.number(),
      chunksCount: z.number(),
      characters: z.number(),
      dataStats: z.array(
        z.object({
          status: z.string(),
          files: z.number().describe('Number of files with this indexing status'),
          bytes: z
            .number()
            .nullable()
            .describe(
              'Total bytes for this indexing status, or null when Needle does not report a size'
            )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    let stats = await client.getCollectionStats(ctx.input.collectionId);
    return {
      output: {
        collectionId: ctx.input.collectionId,
        users: stats.users,
        chunksCount: stats.chunks_count,
        characters: stats.characters,
        dataStats: stats.data_stats
      },
      message: `Retrieved indexing statistics for collection \`${ctx.input.collectionId}\`.`
    };
  })
  .build();
