import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLinkedDomains = SlateTool.create(spec, {
  name: 'Get Linked Domains',
  key: 'get_linked_domains',
  description: `Retrieve domains that a target website links out to. Returns the external domains receiving outbound links from the target, along with link counts and metrics.
Use to analyze a site's outbound linking patterns and identify its most-linked external resources.`,
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
      target: z.string().describe('Domain or URL to get linked domains for'),
      date: z
        .string()
        .optional()
        .describe('Date for the snapshot in YYYY-MM-DD format. Defaults to today.'),
      mode: z
        .enum(['exact', 'domain', 'subdomains', 'prefix'])
        .optional()
        .describe('Target mode'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      where: z.string().optional().describe('Filter expression in Ahrefs filter syntax'),
      orderBy: z.string().optional().describe('Sort order'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      linkedDomains: z.any().describe('List of domains the target links out to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLinkedDomains({
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
        linkedDomains: result
      },
      message: `Retrieved linked domains for **${ctx.input.target}**.`
    };
  })
  .build();
