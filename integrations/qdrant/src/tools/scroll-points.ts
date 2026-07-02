import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let scrollPoints = SlateTool.create(spec, {
  name: 'Scroll Points',
  key: 'scroll_points',
  description: `Iterates through points in a collection with pagination. Supports filtering by payload conditions. Returns points along with a pagination offset for fetching the next page. Useful for browsing, exporting, or processing all points in a collection.`,
  instructions: [
    'Use the `nextPageOffset` from the response as the `offset` in the next call to continue pagination.',
    'When `nextPageOffset` is null, there are no more pages.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      limit: z.number().optional().describe('Maximum number of points per page (default: 10)'),
      offset: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Pagination offset from a previous scroll response'),
      filter: z.any().optional().describe('Filter condition (Qdrant filter syntax)'),
      withPayload: z
        .boolean()
        .optional()
        .describe('Include payload in response (default: true)'),
      withVector: z
        .boolean()
        .optional()
        .describe('Include vector in response (default: false)')
    })
  )
  .output(
    z.object({
      points: z
        .array(
          z.object({
            pointId: z.union([z.number(), z.string()]).describe('Point identifier'),
            payload: z.any().optional().describe('Point payload'),
            vector: z.any().optional().describe('Point vector (if requested)')
          })
        )
        .describe('Points in the current page'),
      nextPageOffset: z
        .union([z.string(), z.number()])
        .nullable()
        .describe('Offset for the next page, null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let result = await client.scrollPoints(ctx.input.collectionName, {
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      filter: ctx.input.filter,
      withPayload: ctx.input.withPayload,
      withVector: ctx.input.withVector
    });

    let points = result.points.map((p: any) => ({
      pointId: p.id,
      payload: p.payload,
      vector: p.vector
    }));

    return {
      output: {
        points,
        nextPageOffset: result.nextPageOffset ?? null
      },
      message: `Returned **${points.length}** point(s) from \`${ctx.input.collectionName}\`.${result.nextPageOffset ? ' More pages available.' : ' No more pages.'}`
    };
  })
  .build();
