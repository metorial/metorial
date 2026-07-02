import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let recommenderSchema = z.object({
  recommenderId: z.string().describe('Unique identifier of the recommender'),
  name: z.string().describe('Human-readable name of the recommender'),
  status: z
    .string()
    .optional()
    .describe('Current status: new, starting, running, ready, or error'),
  createdAt: z.string().optional().describe('Timestamp when the recommender was created'),
  updatedAt: z.string().optional().describe('Timestamp when the recommender was last updated')
});

export let listRecommenders = SlateTool.create(spec, {
  name: 'List Recommenders',
  key: 'list_recommenders',
  description: `Retrieve all recommenders in your Faraday account. Recommenders create product or content recommendation models that suggest next-best-offer or first-best-offer for individuals.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      recommenders: z.array(recommenderSchema).describe('List of all recommenders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let recommenders = await client.listRecommenders();

    let mapped = recommenders.map((r: any) => ({
      recommenderId: r.id,
      name: r.name,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return {
      output: { recommenders: mapped },
      message: `Found **${mapped.length}** recommender(s).`
    };
  })
  .build();

export let getRecommender = SlateTool.create(spec, {
  name: 'Get Recommender',
  key: 'get_recommender',
  description: `Retrieve detailed information about a specific recommender, including its configuration, status, and bias mitigation settings.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      recommenderId: z.string().describe('UUID of the recommender to retrieve')
    })
  )
  .output(
    recommenderSchema.extend({
      streamName: z
        .string()
        .optional()
        .describe('Name of the stream used for recommendations'),
      eligibility: z
        .record(z.string(), z.any())
        .optional()
        .describe('Eligibility rules configuration'),
      biasMitigation: z
        .record(z.string(), z.any())
        .optional()
        .describe('Bias mitigation configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let r = await client.getRecommender(ctx.input.recommenderId);

    return {
      output: {
        recommenderId: r.id,
        name: r.name,
        status: r.status,
        streamName: r.stream_name,
        eligibility: r.eligibility,
        biasMitigation: r.bias_mitigation,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      },
      message: `Recommender **${r.name}** is **${r.status}**.`
    };
  })
  .build();
