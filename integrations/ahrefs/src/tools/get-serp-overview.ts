import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSerpOverview = SlateTool.create(spec, {
  name: 'Get SERP Overview',
  key: 'get_serp_overview',
  description: `Retrieve the current search engine results page (SERP) data for a given keyword. Returns up to the top 100 organic results with their URLs and associated SEO metrics.
Use for competitive analysis of specific search queries to see which pages currently rank and their authority metrics.`,
  constraints: [
    'Consumes API units (minimum 50 per request).',
    'Rate limited to 60 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Keyword to get SERP results for'),
      country: z
        .string()
        .optional()
        .describe(
          'Two-letter country code for localized SERP results (e.g., "us", "uk"). Defaults to "us".'
        ),
      select: z.string().optional().describe('Comma-separated list of fields to return')
    })
  )
  .output(
    z.object({
      serpResults: z.any().describe('SERP data including ranking URLs and their SEO metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSerpOverview({
      keyword: ctx.input.keyword,
      country: ctx.input.country,
      select: ctx.input.select
    });

    return {
      output: {
        serpResults: result
      },
      message: `Retrieved SERP overview for **"${ctx.input.keyword}"** in ${ctx.input.country || 'us'}.`
    };
  })
  .build();
