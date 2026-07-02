import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaigns = SlateTool.create(spec, {
  name: 'Get Campaigns',
  key: 'get_campaigns',
  description: `Retrieve email campaigns from your Doppler account. Returns campaign details including sender info, subject, status, and scheduling.
Supports fetching all campaigns, filtering by status, or retrieving a single campaign by ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .number()
        .optional()
        .describe('If provided, fetches a single campaign by its ID'),
      status: z
        .enum(['draft', 'scheduled', 'shipping', 'shipped'])
        .optional()
        .describe('Filter campaigns by status'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of items per page')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.number().describe('Unique identifier of the campaign'),
            name: z.string().describe('Campaign name'),
            fromName: z.string().describe('Sender name'),
            fromEmail: z.string().describe('Sender email'),
            subject: z.string().describe('Email subject line'),
            preheader: z.string().optional().describe('Preview text'),
            replyTo: z.string().optional().describe('Reply-to email'),
            status: z
              .string()
              .describe('Campaign status (draft, scheduled, shipping, shipped)'),
            scheduledDate: z.string().optional().describe('Scheduled send date')
          })
        )
        .describe('Array of campaigns'),
      totalCount: z.number().describe('Total number of campaigns'),
      currentPage: z.number().optional().describe('Current page number'),
      pagesCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    if (ctx.input.campaignId !== undefined) {
      let campaign = await client.getCampaign(ctx.input.campaignId);
      return {
        output: {
          campaigns: [
            {
              campaignId: campaign.campaignId,
              name: campaign.name,
              fromName: campaign.fromName,
              fromEmail: campaign.fromEmail,
              subject: campaign.subject,
              preheader: campaign.preheader,
              replyTo: campaign.replyTo,
              status: campaign.status,
              scheduledDate: campaign.scheduledDate
            }
          ],
          totalCount: 1
        },
        message: `Campaign **${campaign.name}** (status: ${campaign.status}).`
      };
    }

    let result = await client.getCampaigns(
      ctx.input.page,
      ctx.input.pageSize,
      ctx.input.status
    );
    let campaigns = (result.items ?? []).map(c => ({
      campaignId: c.campaignId,
      name: c.name,
      fromName: c.fromName,
      fromEmail: c.fromEmail,
      subject: c.subject,
      preheader: c.preheader,
      replyTo: c.replyTo,
      status: c.status,
      scheduledDate: c.scheduledDate
    }));

    return {
      output: {
        campaigns,
        totalCount: result.itemsCount,
        currentPage: result.currentPage,
        pagesCount: result.pagesCount
      },
      message: `Found **${result.itemsCount}** campaigns (page ${result.currentPage} of ${result.pagesCount}).`
    };
  })
  .build();
