import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMetricsByCountry = SlateTool.create(spec, {
  name: 'Get Metrics By Country',
  key: 'get_metrics_by_country',
  description: `Retrieve country-specific organic search metrics for a target domain or URL. Shows how organic traffic, keywords, and other metrics are distributed across different countries.
Use to understand geographic distribution of a site's organic search presence.`,
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
      target: z.string().describe('Domain or URL to get country metrics for'),
      date: z
        .string()
        .optional()
        .describe('Date for the snapshot in YYYY-MM-DD format. Defaults to today.'),
      mode: z
        .enum(['exact', 'domain', 'subdomains', 'prefix'])
        .optional()
        .describe('Target mode'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      limit: z.number().optional().describe('Maximum number of countries to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      countryMetrics: z.any().describe('Organic search metrics broken down by country')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getMetricsByCountry({
      target: ctx.input.target,
      date: ctx.input.date,
      mode: ctx.input.mode,
      select: ctx.input.select,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        countryMetrics: result
      },
      message: `Retrieved country-level metrics for **${ctx.input.target}**.`
    };
  })
  .build();
