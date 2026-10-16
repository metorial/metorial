import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ImportClient } from '../lib/client';
import { importScopeFields, resolveImportConfig } from '../lib/context';
import { spec } from '../spec';

export let recordAdPerformance = SlateTool.create(spec, {
  name: 'Record Ad Performance',
  key: 'record_ad_performance',
  description: `Records ad performance data (spend, clicks, impressions) for a specific date. Supports creating ad campaigns, ad sets, and individual ads inline along with the performance data.
If the ad and date combination already exists, the existing performance data will be updated.
Ad hierarchies (Campaign → Ad Set → Ad) can be created in a single call.
Spend amounts are in **cents**.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ...importScopeFields,
      adId: z.string().describe('The ad identifier.'),
      adName: z
        .string()
        .optional()
        .describe('Name of the ad. If provided with adId, the ad will be created/updated.'),
      adCampaignId: z
        .string()
        .optional()
        .describe(
          'Existing campaign ID, required with adName unless provided by adCampaign or adSet.'
        ),
      adSetId: z
        .string()
        .optional()
        .describe('Existing ad set ID, required with adName unless adSet is provided.'),
      date: z.string().describe('Date for the performance data (YYYY-MM-DD).'),
      spend: z.number().describe('Ad spend in cents for the day.'),
      clicks: z.number().optional().describe('Number of clicks for the day.'),
      impressions: z.number().optional().describe('Number of impressions for the day.'),
      adCampaign: z
        .object({
          campaignId: z.string().describe('Campaign ID.'),
          campaignName: z.string().describe('Campaign name.')
        })
        .optional()
        .describe('Ad campaign to associate. Will be created if it does not exist.'),
      adSet: z
        .object({
          adSetId: z.string().describe('Ad set ID.'),
          adSetName: z.string().describe('Ad set name.'),
          campaignId: z.string().optional().describe('Parent campaign ID for the ad set.')
        })
        .optional()
        .describe('Ad set to associate. Will be created if it does not exist.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful.'),
      response: z.unknown().optional().describe('Raw API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImportClient(resolveImportConfig(ctx));
    let campaignId =
      ctx.input.adCampaignId ??
      ctx.input.adCampaign?.campaignId ??
      ctx.input.adSet?.campaignId;
    let adSetId = ctx.input.adSetId ?? ctx.input.adSet?.adSetId;
    if (ctx.input.adName && (!campaignId?.trim() || !adSetId?.trim())) {
      throw createApiServiceError(
        'Creating an ad with adName requires its campaign and ad set IDs. Provide adCampaignId/adSetId or the corresponding inline objects.'
      );
    }
    if (ctx.input.adSet && !campaignId?.trim()) {
      throw createApiServiceError(
        'An inline adSet requires campaignId, adCampaignId, or adCampaign.'
      );
    }
    let campaignIds = [
      ctx.input.adCampaignId,
      ctx.input.adCampaign?.campaignId,
      ctx.input.adSet?.campaignId
    ].filter(value => value !== undefined);
    if (
      new Set(campaignIds).size > 1 ||
      (ctx.input.adSetId && ctx.input.adSet && ctx.input.adSetId !== ctx.input.adSet.adSetId)
    ) {
      throw createApiServiceError(
        'Use the same parent campaign and ad set IDs in the inline objects and ID fields.'
      );
    }

    let body: Record<string, unknown> = {
      date: ctx.input.date,
      spend: ctx.input.spend
    };

    if (ctx.input.adName) {
      body.ad = {
        id: ctx.input.adId,
        name: ctx.input.adName,
        adcampaign: campaignId,
        adset: adSetId
      };
    } else {
      body.ad = ctx.input.adId;
    }

    if (ctx.input.clicks !== undefined) body.clicks = ctx.input.clicks;
    if (ctx.input.impressions !== undefined) body.impressions = ctx.input.impressions;

    if (ctx.input.adCampaign) {
      body.adcampaign = {
        id: ctx.input.adCampaign.campaignId,
        name: ctx.input.adCampaign.campaignName
      };
    } else if (campaignId) {
      body.adcampaign = campaignId;
    }

    if (ctx.input.adSet) {
      let adSetBody: Record<string, unknown> = {
        id: ctx.input.adSet.adSetId,
        name: ctx.input.adSet.adSetName
      };
      adSetBody.adcampaign = campaignId;
      body.adset = adSetBody;
    } else if (adSetId) {
      body.adset = adSetId;
    }

    let response = await client.recordAdPerformance(body);

    return {
      output: {
        success: true,
        response
      },
      message: `Ad performance recorded for ad **${ctx.input.adId}** on **${ctx.input.date}** — spend: ${ctx.input.spend} cents, clicks: ${ctx.input.clicks ?? 'N/A'}, impressions: ${ctx.input.impressions ?? 'N/A'}.`
    };
  })
  .build();
