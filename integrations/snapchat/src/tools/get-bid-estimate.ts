import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { snapchatServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getBidEstimate = SlateTool.create(spec, {
  name: 'Get Bid Estimate',
  key: 'get_bid_estimate',
  description: `Retrieve Snapchat bid estimate ranges for an existing ad squad or for a prospective targeting spec. Use this before creating or adjusting ad squads to choose realistic bids.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adSquadId: z
        .string()
        .optional()
        .describe(
          'Existing ad squad ID to estimate. If provided, targeting input is ignored.'
        ),
      adAccountId: z
        .string()
        .optional()
        .describe('Ad account ID for estimating a prospective targeting spec'),
      optimizationGoal: z
        .string()
        .optional()
        .describe(
          'Optimization goal for targeting-spec estimates, e.g. IMPRESSIONS or SWIPES'
        ),
      targeting: z
        .any()
        .optional()
        .describe('Targeting spec object for prospective ad squad estimates')
    })
  )
  .output(
    z.object({
      adSquadId: z
        .string()
        .optional()
        .describe('Ad squad ID, when estimating an existing ad squad'),
      optimizationGoal: z
        .string()
        .optional()
        .describe('Optimization goal used for the estimate'),
      bidEstimateMinimum: z
        .number()
        .optional()
        .describe('Minimum estimated bid in micro-currency'),
      bidEstimateMaximum: z
        .number()
        .optional()
        .describe('Maximum estimated bid in micro-currency'),
      requestId: z.string().optional().describe('Snapchat request ID for debugging'),
      response: z.any().optional().describe('Raw Snapchat response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);

    let result: any;
    if (ctx.input.adSquadId) {
      result = await client.getBidEstimateForAdSquad(ctx.input.adSquadId);
    } else {
      if (!ctx.input.adAccountId) {
        throw snapchatServiceError('adAccountId is required when adSquadId is not provided.');
      }
      if (!ctx.input.optimizationGoal) {
        throw snapchatServiceError(
          'optimizationGoal is required when adSquadId is not provided.'
        );
      }
      if (!ctx.input.targeting) {
        throw snapchatServiceError('targeting is required when adSquadId is not provided.');
      }

      result = await client.getBidEstimateForSpec(
        ctx.input.adAccountId,
        ctx.input.optimizationGoal,
        ctx.input.targeting
      );
    }

    let bidEstimate = result.bid_estimate ?? {};
    let output = {
      adSquadId: bidEstimate.ad_squad_id,
      optimizationGoal: bidEstimate.optimization_goal,
      bidEstimateMinimum: bidEstimate.bid_estimate_minimum,
      bidEstimateMaximum: bidEstimate.bid_estimate_maximum,
      requestId: result.request_id,
      response: result
    };

    return {
      output,
      message: `Estimated Snapchat bid range: **${output.bidEstimateMinimum ?? 'unknown'}** to **${output.bidEstimateMaximum ?? 'unknown'}** micro-currency.`
    };
  })
  .build();
