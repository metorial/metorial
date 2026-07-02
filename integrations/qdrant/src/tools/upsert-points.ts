import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let upsertPoints = SlateTool.create(spec, {
  name: 'Upsert Points',
  key: 'upsert_points',
  description: `Inserts or updates points (vectors with optional JSON payloads) in a collection. Supports batch operations. Each point requires an ID (integer or UUID string) and a vector. Payloads can include any JSON data for filtering and retrieval.`,
  instructions: [
    'Point IDs can be integers or UUID strings.',
    'For named vector collections, provide vectors as an object with vector names as keys.',
    'For single-vector collections, provide vectors as an array of numbers.'
  ],
  constraints: ['Maximum batch size depends on your cluster configuration.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the target collection'),
      points: z
        .array(
          z.object({
            pointId: z
              .union([z.number(), z.string()])
              .describe('Unique identifier for the point (integer or UUID)'),
            vector: z
              .any()
              .describe(
                'Vector data: array of numbers for single vector, or object of {name: vector} for named vectors'
              ),
            payload: z
              .record(z.string(), z.any())
              .optional()
              .describe('Optional JSON payload to attach to the point')
          })
        )
        .describe('Points to upsert'),
      wait: z
        .boolean()
        .optional()
        .describe('Wait for operation to complete before returning (default: true)')
    })
  )
  .output(
    z.object({
      operationId: z.number().optional().describe('Operation ID for the upsert'),
      status: z.string().describe('Operation status: acknowledged, completed, or wait_timeout')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let points = ctx.input.points.map(p => ({
      id: p.pointId,
      vector: p.vector,
      payload: p.payload
    }));

    let result = await client.upsertPoints(
      ctx.input.collectionName,
      points,
      ctx.input.wait ?? true
    );

    return {
      output: {
        operationId: result.result?.operation_id,
        status: result.result?.status ?? 'completed'
      },
      message: `Upserted **${ctx.input.points.length}** point(s) into \`${ctx.input.collectionName}\`. Status: **${result.result?.status ?? 'completed'}**.`
    };
  })
  .build();
