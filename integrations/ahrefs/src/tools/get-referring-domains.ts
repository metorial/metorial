import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReferringDomains = SlateTool.create(spec, {
  name: 'Get Referring Domains',
  key: 'get_referring_domains',
  description: `Retrieve the list of referring domains that contain backlinks to a target domain or URL.
Each referring domain entry includes metrics like domain rating. Useful for understanding the diversity and quality of a site's backlink sources.`,
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
      target: z.string().describe('Domain or URL to get referring domains for'),
      date: z
        .string()
        .optional()
        .describe('Date for the snapshot in YYYY-MM-DD format. Defaults to today.'),
      mode: z
        .enum(['exact', 'domain', 'subdomains', 'prefix'])
        .optional()
        .describe('Target mode: "exact", "domain", "subdomains", or "prefix"'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      where: z
        .string()
        .optional()
        .describe('Filter expression in Ahrefs filter syntax (JSON string)'),
      orderBy: z.string().optional().describe('Sort order, e.g., "domain_rating:desc"'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      referringDomains: z.any().describe('List of referring domains with their metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getReferringDomains({
      target: ctx.input.target,
      date: ctx.input.date,
      mode: ctx.input.mode,
      select: ctx.input.select,
      where: ctx.input.where,
      order_by: ctx.input.orderBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        referringDomains: result
      },
      message: `Retrieved referring domains for **${ctx.input.target}**.`
    };
  })
  .build();
