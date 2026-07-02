import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let deletePoints = SlateTool.create(spec, {
  name: 'Delete Points',
  key: 'delete_points',
  description: `Deletes points from a collection by IDs or by a filter condition. Use IDs for targeted deletion or filters for bulk removal based on payload conditions.`,
  instructions: [
    'Provide either `pointIds` for deletion by ID, or `filter` for conditional deletion. Do not provide both.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      pointIds: z
        .array(z.union([z.number(), z.string()]))
        .optional()
        .describe('Specific point IDs to delete'),
      filter: z
        .any()
        .optional()
        .describe(
          'Filter condition for bulk deletion (uses Qdrant filter syntax with must/should/must_not clauses)'
        ),
      wait: z.boolean().optional().describe('Wait for operation to complete (default: true)')
    })
  )
  .output(
    z.object({
      operationId: z.number().optional().describe('Operation ID'),
      status: z.string().describe('Operation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let selector: any = {};
    if (ctx.input.pointIds) {
      selector.points = ctx.input.pointIds;
    } else if (ctx.input.filter) {
      selector.filter = ctx.input.filter;
    } else {
      throw new Error('Either pointIds or filter must be provided');
    }

    let result = await client.deletePoints(
      ctx.input.collectionName,
      selector,
      ctx.input.wait ?? true
    );

    return {
      output: {
        operationId: result.result?.operation_id,
        status: result.result?.status ?? 'completed'
      },
      message: ctx.input.pointIds
        ? `Deleted **${ctx.input.pointIds.length}** point(s) from \`${ctx.input.collectionName}\`. Status: **${result.result?.status ?? 'completed'}**.`
        : `Deleted points matching filter from \`${ctx.input.collectionName}\`. Status: **${result.result?.status ?? 'completed'}**.`
    };
  })
  .build();
