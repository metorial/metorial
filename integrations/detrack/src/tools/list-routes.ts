import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
import { spec } from '../spec';

export let listRoutesTool = SlateTool.create(spec, {
  name: 'List Routes',
  key: 'list_routes',
  description:
    'Retrieves routes for a date, optionally by exact route name. Returns route IDs, status, assigned vehicles, planned jobs and available planning details in full provider records.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      date: z.string().describe('Route date in YYYY-MM-DD format'),
      name: z.string().optional().describe('Exact route name to retrieve for the date'),
      page: z.number().optional().describe('Page number, starting at 1'),
      limit: z
        .number()
        .optional()
        .describe('Number of routes per page; provider default is 25')
    })
  )
  .output(
    z.object({
      routes: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Full route records including job and vehicle details when available'),
      total: z.number().optional().describe('Total route count when provided'),
      page: z.number().describe('Requested page number'),
      links: z.record(z.string(), z.unknown()).optional().describe('Provider pagination links')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new DetrackClient(ctx.auth.token).listRoutes(ctx.input);
    return {
      output: {
        routes: result.records,
        total: result.total,
        page: result.page,
        links: result.links
      },
      message: `Retrieved **${result.records.length}** route(s) for ${ctx.input.date}.`
    };
  })
  .build();
