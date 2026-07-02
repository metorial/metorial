import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve detailed information about a specific campaign, including its actions, metrics, and configuration. Optionally fetch campaign metrics with configurable time periods.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('The ID of the campaign to retrieve'),
      includeMetrics: z
        .boolean()
        .optional()
        .describe('Whether to also fetch campaign metrics'),
      metricsPeriod: z
        .enum(['hours', 'days', 'weeks', 'months'])
        .optional()
        .describe('Time period for metrics aggregation'),
      metricsSteps: z.number().optional().describe('Number of time periods to return')
    })
  )
  .output(
    z.object({
      campaign: z
        .record(z.string(), z.unknown())
        .describe('The campaign object with full details'),
      actions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Campaign actions/steps'),
      metrics: z.record(z.string(), z.unknown()).optional().describe('Campaign metrics data')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let campaignResult = await appClient.getCampaign(ctx.input.campaignId);
    let campaign = campaignResult?.campaign ?? campaignResult;

    let actionsResult = await appClient.getCampaignActions(ctx.input.campaignId);
    let actions = actionsResult?.actions;

    let metrics: Record<string, unknown> | undefined;
    if (ctx.input.includeMetrics) {
      let metricsResult = await appClient.getCampaignMetrics(ctx.input.campaignId, {
        period: ctx.input.metricsPeriod,
        steps: ctx.input.metricsSteps
      });
      metrics = metricsResult;
    }

    return {
      output: { campaign, actions, metrics },
      message: `Retrieved campaign **${campaign?.name ?? ctx.input.campaignId}**.`
    };
  })
  .build();
