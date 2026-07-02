import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTechnologyTrends = SlateTool.create(spec, {
  name: 'Get Technology Trends',
  key: 'get_technology_trends',
  description: `Track technology adoption trends over time. Returns historical usage data showing how many websites use a specific technology, with the ability to query totals as of a specific historical date.

Useful for market research, competitive analysis, and understanding technology growth patterns.`,
  instructions: [
    'Use the exact technology name as it appears on BuiltWith Trends.',
    'The optional date parameter retrieves historical totals closest to that date.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      technology: z
        .string()
        .describe('Technology name to get trends for (e.g., "Shopify", "React")'),
      date: z
        .string()
        .optional()
        .describe('Get historical totals as of this date (format: YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      technology: z.string().describe('Technology name queried'),
      trends: z.any().describe('Trend data including adoption counts over time')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.trends({
      technology: ctx.input.technology,
      date: ctx.input.date
    });

    return {
      output: {
        technology: ctx.input.technology,
        trends: data
      },
      message: `Retrieved technology trends for **${ctx.input.technology}**${ctx.input.date ? ` as of ${ctx.input.date}` : ''}.`
    };
  });
