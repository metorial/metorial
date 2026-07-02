import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve detailed information about a specific campaign including its settings, steps, email content, delivery times, and configuration. Also retrieves campaign statistics when available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('The ID of the campaign to retrieve'),
      includeStatistics: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch campaign statistics')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      name: z.string().describe('Campaign name'),
      status: z.string().describe('Campaign status'),
      settings: z
        .any()
        .optional()
        .describe('Campaign settings (timezone, daily enroll, tracking, etc.)'),
      steps: z
        .any()
        .optional()
        .describe('Campaign steps with email content and delivery times'),
      statistics: z.any().optional().describe('Campaign statistics if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let campaign = await client.getCampaign(ctx.input.campaignId);

    let statistics: any;
    if (ctx.input.includeStatistics) {
      try {
        statistics = await client.getCampaignStatistics(ctx.input.campaignId);
      } catch (err) {
        ctx.warn(['Could not fetch campaign statistics', err]);
      }
    }

    return {
      output: {
        campaignId: campaign.id ?? campaign.campaign_id ?? ctx.input.campaignId,
        name: campaign.name ?? '',
        status: campaign.status ?? '',
        settings: campaign.settings,
        steps: campaign.steps,
        statistics
      },
      message: `Retrieved campaign **${campaign.name ?? ctx.input.campaignId}** (status: ${campaign.status ?? 'unknown'}).`
    };
  })
  .build();
