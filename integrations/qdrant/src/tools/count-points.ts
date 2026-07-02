import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let countPoints = SlateTool.create(spec, {
  name: 'Count Points',
  key: 'count_points',
  description: `Counts the number of points in a collection, optionally filtered by payload conditions. Supports both exact and approximate counting modes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      filter: z
        .any()
        .optional()
        .describe('Filter condition to count matching points (Qdrant filter syntax)'),
      exact: z
        .boolean()
        .optional()
        .describe(
          'Use exact counting (slower but precise) or approximate (faster). Default: true'
        )
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of points matching the criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let count = await client.countPoints(
      ctx.input.collectionName,
      ctx.input.filter,
      ctx.input.exact
    );

    return {
      output: { count },
      message: `Collection \`${ctx.input.collectionName}\` contains **${count}** point(s)${ctx.input.filter ? ' matching the filter' : ''}.`
    };
  })
  .build();
