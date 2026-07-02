import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve a list of campaigns with optional filtering by date range and status. Useful for reviewing campaign history and finding campaign IDs for statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Maximum number of campaigns to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      status: z.string().optional().describe('Filter by status')
    })
  )
  .output(
    z.object({
      campaigns: z.any().describe('List of campaigns matching the filter criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let campaigns = await client.getCampaigns({
      from: ctx.input.from,
      to: ctx.input.to,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      status: ctx.input.status
    });

    let count = Array.isArray(campaigns) ? campaigns.length : 0;
    return {
      output: { campaigns },
      message: `Retrieved **${count}** campaign(s)`
    };
  })
  .build();
