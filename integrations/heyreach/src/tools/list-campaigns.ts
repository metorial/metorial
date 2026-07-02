import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve LinkedIn outreach campaigns from your HeyReach account. Supports filtering by keyword, status, and LinkedIn account. Returns campaign details including name, status, and performance metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().optional().describe('Search campaigns by keyword'),
      statuses: z
        .array(z.string())
        .optional()
        .describe('Filter by campaign statuses (e.g., "ACTIVE", "PAUSED", "FINISHED")'),
      accountIds: z.array(z.number()).optional().describe('Filter by LinkedIn account IDs'),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Number of campaigns to return (default: 50)'),
      offset: z.number().optional().default(0).describe('Pagination offset (default: 0)')
    })
  )
  .output(
    z.object({
      campaigns: z.array(z.any()).describe('List of campaign objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAllCampaigns({
      keyword: ctx.input.keyword,
      statuses: ctx.input.statuses,
      accountIds: ctx.input.accountIds,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let campaigns = Array.isArray(result)
      ? result
      : (result?.data ?? result?.items ?? [result]);

    return {
      output: { campaigns },
      message: `Retrieved ${campaigns.length} campaign(s).`
    };
  })
  .build();
