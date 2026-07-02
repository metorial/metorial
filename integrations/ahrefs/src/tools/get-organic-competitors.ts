import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrganicCompetitors = SlateTool.create(spec, {
  name: 'Get Organic Competitors',
  key: 'get_organic_competitors',
  description: `Retrieve organic search competitors for a target domain. Returns websites that rank for similar keywords, along with shared keyword counts and traffic metrics.
Use to identify competing domains in organic search and assess competitive landscape.`,
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
      target: z.string().describe('Domain or URL to find competitors for'),
      date: z
        .string()
        .optional()
        .describe('Date for the snapshot in YYYY-MM-DD format. Defaults to today.'),
      mode: z
        .enum(['exact', 'domain', 'subdomains', 'prefix'])
        .optional()
        .describe('Target mode: "exact", "domain", "subdomains", or "prefix"'),
      country: z.string().optional().describe('Two-letter country code for localized results'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      where: z
        .string()
        .optional()
        .describe('Filter expression in Ahrefs filter syntax (JSON string)'),
      orderBy: z.string().optional().describe('Sort order'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      competitors: z
        .any()
        .describe('List of organic competitors with shared keywords and traffic data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getOrganicCompetitors({
      target: ctx.input.target,
      date: ctx.input.date,
      mode: ctx.input.mode,
      country: ctx.input.country,
      select: ctx.input.select,
      where: ctx.input.where,
      order_by: ctx.input.orderBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        competitors: result
      },
      message: `Retrieved organic competitors for **${ctx.input.target}**.`
    };
  })
  .build();
