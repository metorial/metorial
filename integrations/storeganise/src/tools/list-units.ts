import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUnitsTool = SlateTool.create(spec, {
  name: 'List Units',
  key: 'list_units',
  description: `Retrieve storage units across your sites. Filter by site, unit state (available, occupied, blocked, archived), or search by name. Supports pagination for large inventories. Use **updatedAfter** for incremental syncing.`,
  instructions: [
    'Avoid using the include parameter on large lists (50+ items) for performance reasons.',
    'Use updatedAfter with a UTC timestamp (YYYY-MM-DDTHH:MM:SS.000Z) for incremental data syncing.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().optional().describe('Filter units by site ID'),
      state: z
        .enum(['available', 'occupied', 'blocked', 'archived'])
        .optional()
        .describe('Filter units by state'),
      search: z.string().optional().describe('Search query to filter units'),
      updatedAfter: z
        .string()
        .optional()
        .describe(
          'Only return units updated after this UTC timestamp (e.g. 2024-01-01T00:00:00.000Z)'
        ),
      limit: z.number().optional().describe('Maximum number of units to return'),
      offset: z.number().optional().describe('Number of units to skip for pagination')
    })
  )
  .output(
    z.object({
      units: z.array(z.record(z.string(), z.any())).describe('List of storage units')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let units = await client.listUnits({
      siteId: ctx.input.siteId,
      state: ctx.input.state,
      search: ctx.input.search,
      updatedAfter: ctx.input.updatedAfter,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: { units },
      message: `Retrieved ${units.length} unit(s)${ctx.input.state ? ` in **${ctx.input.state}** state` : ''}.`
    };
  })
  .build();
