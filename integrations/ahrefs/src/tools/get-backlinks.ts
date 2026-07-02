import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBacklinks = SlateTool.create(spec, {
  name: 'Get Backlinks',
  key: 'get_backlinks',
  description: `Retrieve backlinks pointing to a target domain or URL. Returns a list of backlinks with source URLs, anchor text, and link attributes.
Supports filtering for broken backlinks and allows sorting, filtering, and pagination for detailed link profile analysis.`,
  instructions: [
    'Use "includeBroken" to additionally retrieve broken (non-functional) backlinks.',
    'Use the "where" parameter to filter results with Ahrefs filter syntax, e.g., {"and":[{"field":"domain_rating_source","is":["gte",50]}]}.'
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
      target: z.string().describe('Domain or URL to get backlinks for'),
      date: z
        .string()
        .optional()
        .describe('Date for the snapshot in YYYY-MM-DD format. Defaults to today.'),
      mode: z
        .enum(['exact', 'domain', 'subdomains', 'prefix'])
        .optional()
        .describe('Target mode: "exact", "domain", "subdomains", or "prefix"'),
      select: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return (refer to Ahrefs API docs for available fields)'
        ),
      where: z
        .string()
        .optional()
        .describe('Filter expression in Ahrefs filter syntax (JSON string)'),
      orderBy: z.string().optional().describe('Sort order, e.g., "domain_rating_source:desc"'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination'),
      includeBroken: z
        .boolean()
        .optional()
        .describe('If true, also fetches broken backlinks separately')
    })
  )
  .output(
    z.object({
      backlinks: z.any().describe('List of backlinks with source URLs and link attributes'),
      brokenBacklinks: z
        .any()
        .optional()
        .describe('List of broken backlinks (only if includeBroken is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params = {
      target: ctx.input.target,
      date: ctx.input.date,
      mode: ctx.input.mode,
      select: ctx.input.select,
      where: ctx.input.where,
      order_by: ctx.input.orderBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    };

    let backlinks = await client.getBacklinks(params);

    let brokenBacklinks: any;
    if (ctx.input.includeBroken) {
      brokenBacklinks = await client.getBrokenBacklinks(params);
    }

    return {
      output: {
        backlinks,
        brokenBacklinks
      },
      message: `Retrieved backlinks for **${ctx.input.target}**${ctx.input.includeBroken ? ' (including broken backlinks)' : ''}.`
    };
  })
  .build();
