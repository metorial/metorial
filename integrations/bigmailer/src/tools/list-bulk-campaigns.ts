import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBulkCampaigns = SlateTool.create(spec, {
  name: 'List Bulk Campaigns',
  key: 'list_bulk_campaigns',
  description: `List bulk (marketing) campaigns within a brand. Returns campaign details including subject, status, tracking settings, and delivery metrics such as sends, opens, clicks, bounces, and complaints.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of campaigns to return (1-100). Defaults to 10.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      hasMore: z.boolean().describe('Whether more campaigns exist beyond this page'),
      cursor: z.string().describe('Cursor for fetching the next page'),
      total: z.number().describe('Total number of campaigns'),
      campaigns: z.array(
        z.object({
          campaignId: z.string().describe('Campaign unique identifier'),
          name: z.string().describe('Campaign name'),
          subject: z.string().describe('Email subject line'),
          status: z.string().describe('Campaign status'),
          numSent: z.number().describe('Emails sent'),
          numOpens: z.number().describe('Unique opens'),
          numClicks: z.number().describe('Unique clicks'),
          numHardBounces: z.number().describe('Hard bounces'),
          numSoftBounces: z.number().describe('Soft bounces'),
          numComplaints: z.number().describe('Complaints'),
          numUnsubscribes: z.number().describe('Unsubscribes'),
          createdAt: z.string().describe('Creation timestamp (ISO 8601)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listBulkCampaigns(ctx.input.brandId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let campaigns = result.data.map(c => ({
      campaignId: c.id,
      name: c.name || '',
      subject: c.subject || '',
      status: c.status,
      numSent: c.num_sent,
      numOpens: c.num_opens,
      numClicks: c.num_clicks,
      numHardBounces: c.num_hard_bounces,
      numSoftBounces: c.num_soft_bounces,
      numComplaints: c.num_complaints,
      numUnsubscribes: c.num_unsubscribes,
      createdAt: new Date(c.created * 1000).toISOString()
    }));

    return {
      output: {
        hasMore: result.has_more,
        cursor: result.cursor,
        total: result.total,
        campaigns
      },
      message: `Found **${result.total}** campaign(s). Returned **${campaigns.length}** campaign(s)${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
