import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBulkCampaign = SlateTool.create(spec, {
  name: 'Get Bulk Campaign',
  key: 'get_bulk_campaign',
  description:
    'Retrieve a bulk campaign by ID, including its content, target lists, schedule, status, and delivery metrics. Call list_bulk_campaigns to discover campaign IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      brandId: z
        .string()
        .describe('Brand ID. Call list_brands to discover authorized brands.'),
      campaignId: z
        .string()
        .describe('Campaign ID from create_bulk_campaign or list_bulk_campaigns')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign identifier'),
      name: z.string().describe('Campaign name'),
      subject: z.string().optional().describe('Email subject'),
      status: z.string().describe('Campaign status'),
      html: z.string().optional().describe('HTML email body'),
      text: z.string().optional().describe('Plain text email body'),
      listIds: z.array(z.string()).optional().describe('Target list IDs'),
      excludedListIds: z.array(z.string()).optional().describe('Excluded list IDs'),
      scheduledFor: z.number().optional().describe('Scheduled send time in Unix seconds'),
      numSent: z.number().optional().describe('Emails sent'),
      numRejected: z.number().optional().describe('Emails rejected'),
      numOpens: z.number().optional().describe('Unique opens'),
      numClicks: z.number().optional().describe('Unique clicks'),
      numHardBounces: z.number().optional().describe('Hard bounces'),
      numSoftBounces: z.number().optional().describe('Soft bounces'),
      numComplaints: z.number().optional().describe('Complaints'),
      numUnsubscribes: z.number().optional().describe('Unsubscribes'),
      createdAt: z.string().describe('Creation time in ISO 8601')
    })
  )
  .handleInvocation(async ctx => {
    let campaign = await new Client(ctx.auth.token).getBulkCampaign(
      ctx.input.brandId,
      ctx.input.campaignId
    );
    return {
      output: {
        campaignId: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        html: campaign.html,
        text: campaign.text,
        listIds: campaign.list_ids,
        excludedListIds: campaign.excluded_list_ids,
        scheduledFor: campaign.scheduled_for,
        numSent: campaign.num_sent,
        numRejected: campaign.num_rejected,
        numOpens: campaign.num_opens,
        numClicks: campaign.num_clicks,
        numHardBounces: campaign.num_hard_bounces,
        numSoftBounces: campaign.num_soft_bounces,
        numComplaints: campaign.num_complaints,
        numUnsubscribes: campaign.num_unsubscribes,
        createdAt: new Date(campaign.created * 1000).toISOString()
      },
      message: `Retrieved bulk campaign **${campaign.name}** (${campaign.status}).`
    };
  })
  .build();
