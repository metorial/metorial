import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichIntent = SlateTool.create(spec, {
  name: 'Enrich Intent',
  key: 'enrich_intent',
  description: `Enrich intent data for a specific company. Returns detailed intent signals including topics being researched, signal scores, audience strength, and recommended contacts. Helps understand a specific company's active research interests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.number().optional().describe('ZoomInfo company ID'),
      companyName: z.string().optional().describe('Company name'),
      companyWebsite: z.string().optional().describe('Company website domain'),
      topicId: z.string().optional().describe('Specific topic ID to get intent data for')
    })
  )
  .output(
    z.object({
      intentSignals: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Intent signals for the company, including topics, scores, and recommended contacts'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.enrichIntent(ctx.input);

    let intentSignals = result.data || result.result || [];

    return {
      output: { intentSignals },
      message: `Retrieved **${intentSignals.length}** intent signal(s) for the company.`
    };
  })
  .build();
