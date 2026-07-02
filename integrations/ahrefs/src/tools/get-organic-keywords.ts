import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrganicKeywords = SlateTool.create(spec, {
  name: 'Get Organic Keywords',
  key: 'get_organic_keywords',
  description: `Retrieve organic keywords that a target domain or URL ranks for in Google search results.
Returns keyword data including search volume, position, traffic, and more. Useful for analyzing a site's organic search presence and identifying top-performing keywords.`,
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
      target: z.string().describe('Domain or URL to get organic keywords for'),
      date: z
        .string()
        .optional()
        .describe('Date for the snapshot in YYYY-MM-DD format. Defaults to today.'),
      mode: z
        .enum(['exact', 'domain', 'subdomains', 'prefix'])
        .optional()
        .describe('Target mode: "exact", "domain", "subdomains", or "prefix"'),
      country: z
        .string()
        .optional()
        .describe(
          'Two-letter country code for localized results (e.g., "us", "uk", "de"). Defaults to worldwide.'
        ),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      where: z
        .string()
        .optional()
        .describe('Filter expression in Ahrefs filter syntax (JSON string)'),
      orderBy: z
        .string()
        .optional()
        .describe('Sort order, e.g., "volume:desc" or "traffic:desc"'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      organicKeywords: z.any().describe('List of organic keywords with search metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getOrganicKeywords({
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
        organicKeywords: result
      },
      message: `Retrieved organic keywords for **${ctx.input.target}**${ctx.input.country ? ` in ${ctx.input.country}` : ''}.`
    };
  })
  .build();
