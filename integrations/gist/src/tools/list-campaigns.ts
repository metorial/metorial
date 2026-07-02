import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List drip email campaigns in your Gist workspace with their performance metrics including open rate, click rate, and subscriber counts.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignId: z.string(),
          name: z.string().optional(),
          status: z.string().optional(),
          openRate: z.number().optional(),
          clickRate: z.number().optional(),
          subscriberCount: z.number().optional(),
          createdAt: z.string().optional()
        })
      ),
      pages: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let data = await client.listCampaigns({
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let campaigns = (data.campaigns || []).map((c: any) => ({
      campaignId: String(c.id),
      name: c.name,
      status: c.status,
      openRate: c.open_rate,
      clickRate: c.click_rate,
      subscriberCount: c.subscriber_count,
      createdAt: c.created_at ? String(c.created_at) : undefined
    }));

    return {
      output: { campaigns, pages: data.pages },
      message: `Found **${campaigns.length}** campaigns.`
    };
  })
  .build();
