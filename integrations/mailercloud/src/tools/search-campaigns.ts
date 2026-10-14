import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getMailercloudCount, getMailercloudItems } from '../lib/responses';
import { spec } from '../spec';

export let searchCampaigns = SlateTool.create(spec, {
  name: 'Search Campaigns',
  key: 'search_campaigns',
  description:
    'Search email campaigns by name or status. Returns campaign IDs, sending state, sender details, and available performance summaries.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      search: z.string().optional().describe('Filter campaigns by name'),
      status: z
        .enum([
          'Processing',
          'Queued',
          'Sending',
          'Paused',
          'Finished',
          'Aborted',
          'Duplicate',
          'Draft',
          'Scheduled',
          'Rescheduled',
          'Failed'
        ])
        .optional()
        .describe('Filter campaigns by sending status'),
      page: z.number().int().min(1).optional().describe('Page number (default: 1)'),
      limit: z.number().int().min(10).max(100).optional().describe('Page size (default: 20)')
    })
  )
  .output(
    z.object({
      campaigns: z.array(z.record(z.string(), z.unknown())).describe('Matching campaigns'),
      totalCount: z.number().describe('Total number of matching campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).searchCampaigns(ctx.input);
    let campaigns = getMailercloudItems(result?.data ?? result);
    let totalCount = getMailercloudCount(result?.count, campaigns.length);
    return {
      output: { campaigns, totalCount },
      message: `Found ${totalCount} campaign(s).`
    };
  })
  .build();
