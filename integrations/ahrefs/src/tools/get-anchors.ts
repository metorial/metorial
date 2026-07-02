import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAnchors = SlateTool.create(spec, {
  name: 'Get Anchor Text',
  key: 'get_anchors',
  description: `Retrieve anchor text distribution for backlinks pointing to a target domain or URL.
Returns a list of anchor texts used in backlinks along with the number of referring domains and backlinks for each anchor. Useful for understanding how other sites describe your content in their links.`,
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
      target: z.string().describe('Domain or URL to get anchor text for'),
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
      orderBy: z.string().optional().describe('Sort order, e.g., "backlinks:desc"'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      anchors: z
        .any()
        .describe('List of anchor texts with backlink and referring domain counts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAnchors({
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
        anchors: result
      },
      message: `Retrieved anchor text distribution for **${ctx.input.target}**.`
    };
  })
  .build();
