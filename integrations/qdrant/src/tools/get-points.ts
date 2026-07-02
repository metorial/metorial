import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let getPoints = SlateTool.create(spec, {
  name: 'Get Points',
  key: 'get_points',
  description: `Retrieves specific points by their IDs from a collection. Returns the point payload and optionally the vector data. Use this to look up known points by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      pointIds: z
        .array(z.union([z.number(), z.string()]))
        .describe('IDs of the points to retrieve'),
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
        .describe('Retrieved points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let results = await client.getPoints(
      ctx.input.collectionName,
      ctx.input.pointIds,
      ctx.input.withPayload,
      ctx.input.withVector
    );

    let points = results.map((r: any) => ({
      pointId: r.id,
      payload: r.payload,
      vector: r.vector
    }));

    return {
      output: { points },
      message: `Retrieved **${points.length}** point(s) from \`${ctx.input.collectionName}\`.`
    };
  })
  .build();
