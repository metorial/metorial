import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve a list of campaigns from Braze with their names, IDs, and tags. Supports pagination and filtering by last edit time. Use the campaign ID to fetch details or trigger API-triggered campaigns.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 0)'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived campaigns in results'),
      sortDirection: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort by creation time (asc or desc)'),
      lastEditTimeGt: z
        .string()
        .optional()
        .describe('Filter campaigns edited after this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.string().describe('Campaign ID'),
            name: z.string().describe('Campaign name'),
            isApiCampaign: z.boolean().optional().describe('Whether this is an API campaign'),
            tags: z.array(z.string()).optional().describe('Tags associated with the campaign'),
            lastEdited: z.string().optional().describe('Last edit timestamp')
          })
        )
        .describe('List of campaigns'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.listCampaigns({
      page: ctx.input.page,
      includeArchived: ctx.input.includeArchived,
      sortDirection: ctx.input.sortDirection,
      lastEditTimeGt: ctx.input.lastEditTimeGt
    });

    let campaigns = (result.campaigns ?? []).map((c: any) => ({
      campaignId: c.id,
      name: c.name,
      isApiCampaign: c.is_api_campaign,
      tags: c.tags,
      lastEdited: c.last_edited
    }));

    return {
      output: {
        campaigns,
        message: result.message
      },
      message: `Found **${campaigns.length}** campaign(s)${ctx.input.page !== undefined ? ` (page ${ctx.input.page})` : ''}.`
    };
  })
  .build();

export let getCampaignDetails = SlateTool.create(spec, {
  name: 'Get Campaign Details',
  key: 'get_campaign_details',
  description: `Retrieve detailed information about a specific Braze campaign, including its configuration, channels, message variants, schedule, and associated segments.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to retrieve details for')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      name: z.string().optional().describe('Campaign name'),
      description: z.string().optional().describe('Campaign description'),
      archived: z.boolean().optional().describe('Whether the campaign is archived'),
      draft: z.boolean().optional().describe('Whether the campaign is a draft'),
      tags: z.array(z.string()).optional().describe('Tags on the campaign'),
      channels: z.array(z.string()).optional().describe('Messaging channels used'),
      schedule: z
        .record(z.string(), z.any())
        .optional()
        .describe('Campaign schedule configuration'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      firstSent: z.string().optional().describe('First send timestamp'),
      lastSent: z.string().optional().describe('Last send timestamp'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.getCampaignDetails(ctx.input.campaignId);

    return {
      output: {
        campaignId: ctx.input.campaignId,
        name: result.name,
        description: result.description,
        archived: result.archived,
        draft: result.draft,
        tags: result.tags,
        channels: result.channels,
        schedule: result.schedule,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        firstSent: result.first_sent,
        lastSent: result.last_sent,
        message: result.message
      },
      message: `Retrieved details for campaign **${result.name ?? ctx.input.campaignId}**.`
    };
  })
  .build();

export let getCampaignAnalytics = SlateTool.create(spec, {
  name: 'Get Campaign Analytics',
  key: 'get_campaign_analytics',
  description: `Retrieve daily analytics time series for a Braze campaign, including sends, deliveries, opens, clicks, conversions, and revenue over a specified number of days.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      length: z.number().describe('Number of days of data to return (max 100)'),
      endingAt: z
        .string()
        .optional()
        .describe('End date for the data series in ISO 8601 format (defaults to now)')
    })
  )
  .output(
    z.object({
      dataSeries: z
        .array(z.record(z.string(), z.any()))
        .describe('Daily analytics data points'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.getCampaignAnalytics(
      ctx.input.campaignId,
      ctx.input.length,
      ctx.input.endingAt
    );

    return {
      output: {
        dataSeries: result.data ?? [],
        message: result.message
      },
      message: `Retrieved **${(result.data ?? []).length}** days of analytics for campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
