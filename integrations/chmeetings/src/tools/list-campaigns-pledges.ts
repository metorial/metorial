import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve pledge campaigns from ChMeetings. Campaigns are used to collect and track donation pledges from members.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 100)')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of campaign records'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Page size'),
      total: z.number().describe('Total number of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCampaigns({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        campaigns: result.data as Record<string, unknown>[],
        page: result.page,
        pageSize: result.page_size,
        total: result.total
      },
      message: `Found **${result.total}** campaign(s). Showing page ${result.page}.`
    };
  })
  .build();

export let listPledges = SlateTool.create(spec, {
  name: 'List Pledges',
  key: 'list_pledges',
  description: `Retrieve pledges for a specific campaign. Shows each member's pledged amount and paid progress.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to retrieve pledges for'),
      page: z.number().optional().describe('Page number (default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 100)')
    })
  )
  .output(
    z.object({
      pledges: z.array(z.record(z.string(), z.unknown())).describe('List of pledge records'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Page size'),
      total: z.number().describe('Total number of pledges')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPledges(ctx.input.campaignId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        pledges: result.data as Record<string, unknown>[],
        page: result.page,
        pageSize: result.page_size,
        total: result.total
      },
      message: `Found **${result.total}** pledge(s) for campaign **${ctx.input.campaignId}**. Showing page ${result.page}.`
    };
  })
  .build();
