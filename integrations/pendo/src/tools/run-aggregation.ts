import { SlateTool } from 'slates';
import { z } from 'zod';
import { PendoClient } from '../lib/client';
import { spec } from '../spec';

export let runAggregation = SlateTool.create(spec, {
  name: 'Run Aggregation',
  key: 'run_aggregation',
  description: `Execute an aggregation query against Pendo's analytics data. Aggregations use a MongoDB-like pipeline to query data sources such as page events, feature events, guide events, poll responses, and track events.

Common data sources: **visitors**, **pageEvents**, **featureEvents**, **guideEvents**, **guidesSeen**, **pollsSeen**, **pollEvents**, **trackEvents**, **events**.

Pipeline steps include **source** (required first step), **filter**, **group**, **sort**, **limit**, **select**, **bulkExpand**, and **identified**.`,
  instructions: [
    'Every pipeline must start with a source step, e.g. `{ "source": { "visitors": null } }`.',
    'Time-based sources like pageEvents and featureEvents require a timeSeries parameter in the source.',
    'For multi-app subscriptions, include `appId: "expandAppIds(\\"*\\")"` in the source to query all apps.',
    'The aggregation endpoint is not intended for bulk export — break large queries into smaller time ranges.'
  ],
  constraints: [
    'Large aggregations may timeout. Use date range filters and limit results when possible.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pipeline: z
        .array(z.any())
        .describe('Array of pipeline steps. First step must be a source step.'),
      requestId: z
        .string()
        .optional()
        .describe('Optional identifier for this aggregation request')
    })
  )
  .output(
    z.object({
      results: z.array(z.any()).describe('Aggregation result rows'),
      totalCount: z.number().describe('Number of result rows returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PendoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let response = await client.runAggregation(ctx.input.pipeline, ctx.input.requestId);

    let results = response.results || response || [];

    return {
      output: {
        results: Array.isArray(results) ? results : [results],
        totalCount: Array.isArray(results) ? results.length : 1
      },
      message: `Aggregation returned **${Array.isArray(results) ? results.length : 1}** result row(s).`
    };
  })
  .build();
