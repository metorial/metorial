import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieves a list of campaigns. Can filter by status (draft, ready, sent) and type (regular, A/B, resend). Returns campaign details including name, type, status, and send statistics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['draft', 'ready', 'sent'])
        .optional()
        .describe('Filter by campaign status'),
      type: z.enum(['regular', 'ab', 'resend']).optional().describe('Filter by campaign type'),
      limit: z.number().optional().describe('Number of campaigns per page'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.string().describe('Campaign ID'),
            name: z.string().describe('Campaign name'),
            type: z.string().describe('Campaign type'),
            status: z.string().describe('Campaign status'),
            sentAt: z.string().optional().nullable().describe('When the campaign was sent'),
            openRate: z.any().optional().describe('Open rate'),
            clickRate: z.any().optional().describe('Click rate'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCampaigns({
      status: ctx.input.status,
      type: ctx.input.type,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let campaigns = (result.data || []).map((c: any) => ({
      campaignId: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      sentAt: c.sent_at,
      openRate: c.stats?.open_rate,
      clickRate: c.stats?.click_rate,
      createdAt: c.created_at
    }));

    return {
      output: { campaigns },
      message: `Retrieved **${campaigns.length}** campaigns${ctx.input.status ? ` with status **${ctx.input.status}**` : ''}.`
    };
  })
  .build();
