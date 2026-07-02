import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let researchKeywords = SlateTool.create(spec, {
  name: 'Research Keywords',
  key: 'research_keywords',
  description: `Retrieve keyword metrics from Keywords Explorer for one or more keywords. Returns search volume, keyword difficulty, CPC, clicks data, and SERP features.
Use to evaluate keyword potential, assess ranking difficulty, and compare multiple keywords at once.`,
  instructions: [
    'Provide either a single keyword or a list of keywords. When providing a list, metrics are returned for each keyword.'
  ],
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
      keyword: z.string().optional().describe('Single keyword to research'),
      keywords: z
        .array(z.string())
        .optional()
        .describe('List of keywords to research (for bulk lookup)'),
      country: z
        .string()
        .optional()
        .describe(
          'Two-letter country code for localized results (e.g., "us", "uk"). Defaults to "us".'
        ),
      select: z.string().optional().describe('Comma-separated list of fields to return')
    })
  )
  .output(
    z.object({
      overview: z
        .any()
        .describe('Keyword metrics including volume, difficulty, CPC, and SERP features')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getKeywordsOverview({
      keyword: ctx.input.keyword,
      keywords: ctx.input.keywords,
      country: ctx.input.country,
      select: ctx.input.select
    });

    let keywordDisplay =
      ctx.input.keyword || (ctx.input.keywords ? ctx.input.keywords.join(', ') : 'keywords');
    return {
      output: {
        overview: result
      },
      message: `Retrieved keyword metrics for **${keywordDisplay}** in ${ctx.input.country || 'us'}.`
    };
  })
  .build();
