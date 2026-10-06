import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, records } from '../lib/client';
import { spec } from '../spec';

export let enrichIntent = SlateTool.create(spec, {
  name: 'Enrich Intent',
  key: 'enrich_intent',
  description: `Enrich intent data for a specific company. Returns topics being researched, signal scores and audience strength. Helps understand a specific company's active research interests.`,
  constraints: [
    'Enrichment can consume credits and counts against request/record limits. Purchased-record and usage history may be retained by ZoomInfo.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.number().optional().describe('ZoomInfo company ID'),
      companyName: z.string().optional().describe('Company name'),
      companyWebsite: z.string().optional().describe('Company website domain'),
      topicId: z.string().optional().describe('Specific topic ID/name from Lookup Data'),
      topicName: z.string().optional().describe('Intent topic name from Lookup Data'),
      topics: z
        .array(z.string())
        .optional()
        .describe('Current GTM requires 1–50 topic names/IDs'),
      page: z.number().int().min(1).optional().describe('Current GTM result page'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Current GTM results per page')
    })
  )
  .output(
    z.object({
      intentSignals: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Intent signals for the company, including topics, scores and audience strength'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = Client.fromContext(ctx);

    let result = await client.enrichIntent(ctx.input);

    const intentSignals = records(result);

    return {
      output: { intentSignals },
      message: `Retrieved **${intentSignals.length}** intent signal(s) for the company.`
    };
  })
  .build();
