import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkTrust = SlateTool.create(spec, {
  name: 'Check Domain Trust',
  key: 'check_trust',
  description: `Evaluate the trustworthiness of a domain using BuiltWith's trust and fraud detection system. Analyzes technology spend, age, relationships with other sites, live response, keywords, and other signals to determine a trust score.

Optionally perform a live lookup and check for custom stopwords in the website's HTML.`,
  instructions: [
    'Use live mode for the most current trust assessment.',
    'Provide comma-separated stopwords to check if specific terms appear on the site.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain to check trust for (e.g., "example.com")'),
      live: z
        .boolean()
        .optional()
        .describe('Perform a live lookup for the most current assessment'),
      stopwords: z
        .string()
        .optional()
        .describe('Comma-separated stopwords to check in website HTML')
    })
  )
  .output(
    z.object({
      trustScore: z.any().optional().describe('Trust score and assessment details'),
      results: z.any().describe('Full trust analysis results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.trust({
      domain: ctx.input.domain,
      live: ctx.input.live,
      stopwords: ctx.input.stopwords
    });

    return {
      output: {
        trustScore: data?.TrustScore ?? data?.Trust ?? undefined,
        results: data
      },
      message: `Trust analysis completed for **${ctx.input.domain}**.`
    };
  });
