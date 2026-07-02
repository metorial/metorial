import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let discoverPoints = SlateTool.create(spec, {
  name: 'Discover Points',
  key: 'discover_points',
  description: `Finds points similar to a target constrained by a context of positive/negative example pairs. Context pairs partition the vector space, guiding the search toward regions where positive examples overlap. Without a target, performs pure context-based exploration. Useful for controlled exploration beyond simple nearest-neighbor search.`,
  instructions: [
    'Provide `context` as an array of positive/negative example pairs.',
    'Optionally provide a `target` vector for targeted discovery.',
    'Without a target, the search explores the region where positive examples from context pairs overlap.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      target: z
        .any()
        .optional()
        .describe('Target vector (array of numbers) or point ID to discover around'),
      context: z
        .array(
          z.object({
            positive: z.any().describe('Positive example: point ID or vector'),
            negative: z.any().describe('Negative example: point ID or vector')
          })
        )
        .describe('Context pairs that constrain the discovery region'),
      filter: z.any().optional().describe('Filter conditions (Qdrant filter syntax)'),
      limit: z.number().optional().describe('Maximum number of results (default: 10)'),
      offset: z.number().optional().describe('Number of results to skip'),
      vectorName: z.string().optional().describe('Named vector space to use'),
      withPayload: z.boolean().optional().describe('Include payloads (default: true)'),
      withVector: z.boolean().optional().describe('Include vectors (default: false)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            pointId: z.union([z.number(), z.string()]).describe('Point identifier'),
            score: z.number().describe('Discovery score'),
            version: z.number().optional().describe('Point version'),
            payload: z.any().optional().describe('Point payload'),
            vector: z.any().optional().describe('Point vector (if requested)')
          })
        )
        .describe('Discovered points ordered by score')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let results = await client.discoverPoints(ctx.input.collectionName, {
      target: ctx.input.target,
      context: ctx.input.context,
      filter: ctx.input.filter,
      limit: ctx.input.limit ?? 10,
      offset: ctx.input.offset,
      withPayload: ctx.input.withPayload ?? true,
      withVector: ctx.input.withVector ?? false,
      using: ctx.input.vectorName
    });

    let mapped = results.map((r: any) => ({
      pointId: r.id,
      score: r.score,
      version: r.version,
      payload: r.payload,
      vector: r.vector
    }));

    return {
      output: { results: mapped },
      message: `Discovered **${mapped.length}** point(s) in \`${ctx.input.collectionName}\`.`
    };
  })
  .build();
