import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
import { spec } from '../spec';

export let listDepotsTool = SlateTool.create(spec, {
  name: 'List Depots',
  key: 'list_depots',
  description:
    'Lists depots with their IDs, names, addresses and coordinates for delivery planning. Returns one page and provider pagination links.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1'),
      limit: z
        .number()
        .optional()
        .describe('Number of depots per page; provider default is 25')
    })
  )
  .output(
    z.object({
      depots: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Full depot records including id, name, address and location'),
      total: z.number().optional().describe('Total depot count when provided'),
      page: z.number().describe('Requested page number'),
      links: z.record(z.string(), z.unknown()).optional().describe('Provider pagination links')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new DetrackClient(ctx.auth.token).listDepots(ctx.input);
    return {
      output: {
        depots: result.records,
        total: result.total,
        page: result.page,
        links: result.links
      },
      message: `Retrieved **${result.records.length}** depot(s) on page ${result.page}.`
    };
  })
  .build();
