import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    let client = new Client({ token: ctx.auth.token });

    let campaigns = await client.listCampaigns({
      status: ctx.input.status,
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      sortBy: 'createdAt',
      sortOrder: ctx.input.sortOrder
    });

    let result = (Array.isArray(campaigns) ? campaigns : []).map((c: any) => ({
      campaignId: c._id,
      name: c.name,
      status: c.status,
      createdAt: c.createdAt,
      hasError: c.hasError,
      errors: c.errors,
      labels: c.labels
    }));

    return {
      output: { campaigns: result },
      message: `Found **${result.length}** campaign(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
