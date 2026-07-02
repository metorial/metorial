import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve campaigns from your Sendlane account. Campaigns are used to send sales, offers, and event-specific content to contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination'),
      perPage: z.number().optional().default(25).describe('Number of results per page')
    })
  )
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignId: z.number().describe('Sendlane campaign ID'),
          name: z.string().describe('Campaign name'),
          subject: z.string().describe('Campaign email subject'),
          status: z.string().describe('Campaign status'),
          type: z.string().describe('Campaign type'),
          createdAt: z.string().describe('When the campaign was created'),
          updatedAt: z.string().describe('When the campaign was last updated'),
          sentAt: z.string().nullable().describe('When the campaign was sent')
        })
      ),
      currentPage: z.number(),
      lastPage: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);
    let result = await client.listCampaigns(ctx.input.page, ctx.input.perPage);

    let campaigns = result.data.map(c => ({
      campaignId: c.id,
      name: c.name ?? '',
      subject: c.subject ?? '',
      status: c.status ?? '',
      type: c.type ?? '',
      createdAt: c.created_at ?? '',
      updatedAt: c.updated_at ?? '',
      sentAt: c.sent_at ?? null
    }));

    return {
      output: {
        campaigns,
        currentPage: result.pagination.currentPage,
        lastPage: result.pagination.lastPage,
        total: result.pagination.total
      },
      message: `Found **${campaigns.length}** campaigns (page ${result.pagination.currentPage} of ${result.pagination.lastPage}).`
    };
  })
  .build();
