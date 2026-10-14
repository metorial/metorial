import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTransactionalCampaigns = SlateTool.create(spec, {
  name: 'List Transactional Campaigns',
  key: 'list_transactional_campaigns',
  description:
    'List transactional campaigns in a brand to discover campaign IDs and activation status before using send_transactional_email.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      brandId: z
        .string()
        .describe('Brand ID. Call list_brands to discover authorized brands.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Page size from 1 to 100; defaults to 10'),
      cursor: z.string().optional().describe('Pagination cursor from the preceding response')
    })
  )
  .output(
    z.object({
      hasMore: z.boolean().describe('Whether another page is available'),
      cursor: z.string().describe('Cursor for the next page'),
      campaigns: z.array(
        z.object({
          campaignId: z.string().describe('Campaign ID for send_transactional_email'),
          name: z.string().describe('Campaign name'),
          subject: z.string().optional().describe('Email subject'),
          status: z.string().describe('Campaign activation status'),
          listId: z.string().optional().describe('List recipients are added to'),
          messageTypeId: z.string().optional().describe('Campaign message type'),
          numSent: z.number().optional().describe('Emails sent'),
          createdAt: z.string().describe('Creation time in ISO 8601')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).listTransactionalCampaigns(
      ctx.input.brandId,
      {
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      }
    );
    let campaigns = result.data.map(campaign => ({
      campaignId: campaign.id,
      name: campaign.name,
      subject: campaign.subject,
      status: campaign.status,
      listId: campaign.list_id,
      messageTypeId: campaign.message_type_id,
      numSent: campaign.num_sent,
      createdAt: new Date(campaign.created * 1000).toISOString()
    }));
    return {
      output: { hasMore: result.has_more, cursor: result.cursor, campaigns },
      message: `Returned **${campaigns.length}** transactional campaign(s)${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
