import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichFindall = SlateTool.create(spec, {
  name: 'Enrich FindAll',
  key: 'enrich_findall',
  description: `Add structured enrichment to a completed or running FindAll entity discovery run. Extracts additional fields from matched entities using a JSON schema you define.
Enrichment runs asynchronously — results will be available when polling with the **Get FindAll Results** tool.`,
  instructions: [
    'The outputSchema defines what additional fields to extract from each matched entity.',
    'Processor tiers: core (standard), advanced (more thorough), auto (system selects).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      findallId: z.string().describe('FindAll run ID to enrich'),
      processor: z.enum(['core', 'advanced', 'auto']).describe('Enrichment processor tier'),
      outputSchema: z
        .record(z.string(), z.unknown())
        .describe('JSON schema defining additional fields to extract from each entity')
    })
  )
  .output(
    z.object({
      findallId: z.string().describe('FindAll run ID that was enriched'),
      enrichmentStarted: z.boolean().describe('Whether enrichment was successfully started')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.enrichFindAll(ctx.input.findallId, {
      processor: ctx.input.processor,
      outputSchema: ctx.input.outputSchema
    });

    return {
      output: {
        findallId: ctx.input.findallId,
        enrichmentStarted: true
      },
      message: `Enrichment started for FindAll run **${ctx.input.findallId}** using processor **${ctx.input.processor}**.`
    };
  })
  .build();
