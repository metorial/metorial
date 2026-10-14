import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getListResult, getObjectResult } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.string(),
  name: z.string().optional(),
  status: z.string().optional(),
  widgetId: z.string().optional(),
  startTime: z.string().optional(),
  interval: z.number().optional(),
  timeZone: z.string().optional(),
  enabled: z.boolean().optional(),
  contacts: z.array(z.unknown()).optional()
});

let mapCampaign = (campaign: Record<string, any>) => ({
  campaignId: campaign.id,
  name: campaign.name ?? undefined,
  status: campaign.status ?? undefined,
  widgetId: campaign.widget_id ?? undefined,
  startTime: campaign.start_time ?? undefined,
  interval: campaign.interval ?? undefined,
  timeZone: campaign.time_zone ?? undefined,
  enabled: campaign.enabled ?? undefined,
  contacts: campaign.contacts ?? undefined
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description:
    'Discover scheduled campaigns and their IDs, status, scheduling, and linked contacts. Retrieve a specific campaign by ID for details.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      campaignId: z.string().optional().describe('Specific campaign ID to retrieve'),
      page: z.number().optional().describe('Page number, starting at 1'),
      size: z.number().optional().describe('Items per page, from 1 to 100')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignSchema).optional(),
      campaign: campaignSchema.optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    if (ctx.input.campaignId) {
      let campaign = mapCampaign(
        getObjectResult(await client.getCampaign(ctx.input.campaignId))
      );
      return {
        output: { campaign },
        message: `Retrieved campaign **${campaign.name || campaign.campaignId}**.`
      };
    }
    let result = getListResult(
      await client.listCampaigns({ page: ctx.input.page, size: ctx.input.size })
    );
    return {
      output: {
        campaigns: result.items.map(mapCampaign),
        totalCount: result.total
      },
      message: `Found **${result.items.length}** campaign(s).`
    };
  })
  .build();
