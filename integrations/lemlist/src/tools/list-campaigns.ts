import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, campaignOutput } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve a list of outreach campaigns. Filter by status (running, draft, archived, ended, paused, errors) and control pagination with offset and limit.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['running', 'draft', 'archived', 'ended', 'paused', 'errors'])
        .optional()
        .describe('Filter campaigns by status'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Number of results per page (max 100)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order by creation date')
    })
  )
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignId: z.string(),
          name: z.string().optional(),
          status: z.string().optional(),
          createdAt: z.string().optional(),
          hasError: z.boolean().optional(),
          errors: z.array(z.string()).optional(),
          labels: z.array(z.string()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const campaigns = (
      await client.listCampaigns({
        status: ctx.input.status,
        offset: ctx.input.offset,
        limit: ctx.input.limit,
        sortBy: 'createdAt',
        sortOrder: ctx.input.sortOrder
      })
    ).map(campaignOutput);
    return {
      output: { campaigns },
      message: `Retrieved **${campaigns.length}** campaign(s) in this page.`
    };
  })
  .build();
