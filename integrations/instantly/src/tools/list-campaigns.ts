import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List campaigns in the Instantly workspace. Supports searching by name, filtering by status and tags, and cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of campaigns to return (1-100). Defaults to 10.'),
      startingAfter: z
        .string()
        .optional()
        .describe(
          'Cursor for pagination. Use the nextStartingAfter value from a previous response.'
        ),
      search: z.string().optional().describe('Search campaigns by name.'),
      status: z
        .number()
        .optional()
        .describe(
          'Filter by campaign status. 0 = draft, 1 = active, 2 = paused, 3 = completed.'
        ),
      tagIds: z.string().optional().describe('Comma-separated tag UUIDs to filter campaigns.')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.string().describe('Campaign ID'),
            name: z.string().describe('Campaign name'),
            status: z.number().describe('Campaign status'),
            timestampCreated: z.string().optional().describe('Creation timestamp'),
            timestampUpdated: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of campaigns'),
      nextStartingAfter: z
        .string()
        .nullable()
        .describe('Cursor for the next page, or null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCampaigns({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter,
      search: ctx.input.search,
      status: ctx.input.status,
      tagIds: ctx.input.tagIds
    });

    let campaigns = result.items.map((c: any) => ({
      campaignId: c.id,
      name: c.name,
      status: c.status,
      timestampCreated: c.timestamp_created,
      timestampUpdated: c.timestamp_updated
    }));

    return {
      output: {
        campaigns,
        nextStartingAfter: result.next_starting_after
      },
      message: `Found **${campaigns.length}** campaign(s).${result.next_starting_after ? ' More pages available.' : ''}`
    };
  })
  .build();
