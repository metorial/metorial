import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let recommendPoints = SlateTool.create(spec, {
  name: 'Recommend Points',
  key: 'recommend_points',
  description: `Finds similar points based on positive and negative examples. Positive examples define what you're looking for; negative examples define what to avoid. Examples can be point IDs or raw vectors. Supports two strategies: \`average_vector\` (averages all examples) and \`best_score\` (evaluates each candidate against all examples).`,
  instructions: [
    'Provide at least one positive example (point ID or vector).',
    'Negative examples are optional but help refine results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      positive: z
        .array(z.any())
        .describe(
          'Positive examples: point IDs (number/string) or raw vectors (number arrays)'
        ),
      negative: z
        .array(z.any())
        .optional()
        .describe('Negative examples: point IDs or raw vectors to move away from'),
      strategy: z
        .enum(['average_vector', 'best_score'])
        .optional()
        .describe('Scoring strategy (default: average_vector)'),
      filter: z.any().optional().describe('Filter conditions (Qdrant filter syntax)'),
      limit: z.number().optional().describe('Maximum number of results (default: 10)'),
      offset: z.number().optional().describe('Number of results to skip'),
      scoreThreshold: z.number().optional().describe('Minimum score threshold'),
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
            score: z.number().describe('Recommendation score'),
            version: z.number().optional().describe('Point version'),
            payload: z.any().optional().describe('Point payload'),
            vector: z.any().optional().describe('Point vector (if requested)')
          })
        )
        .describe('Recommended points ordered by score')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let results = await client.recommendPoints(ctx.input.collectionName, {
      positive: ctx.input.positive,
      negative: ctx.input.negative,
      strategy: ctx.input.strategy,
      filter: ctx.input.filter,
      limit: ctx.input.limit ?? 10,
      offset: ctx.input.offset,
      withPayload: ctx.input.withPayload ?? true,
      withVector: ctx.input.withVector ?? false,
      scoreThreshold: ctx.input.scoreThreshold,
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
      message: `Found **${mapped.length}** recommendation(s) in \`${ctx.input.collectionName}\`.${mapped.length > 0 ? ` Top score: **${mapped[0]!.score}**.` : ''}`
    };
  })
  .build();
