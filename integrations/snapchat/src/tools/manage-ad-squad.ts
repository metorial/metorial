import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { snapchatServiceError } from '../lib/errors';
import { spec } from '../spec';

let adSquadOutputSchema = z.object({
  adSquadId: z.string().describe('Unique ID of the ad squad'),
  campaignId: z.string().optional().describe('Parent campaign ID'),
  name: z.string().optional().describe('Ad squad name'),
  status: z.string().optional().describe('Ad squad status'),
  type: z.string().optional().describe('Ad squad type (SNAP_ADS, LENS, etc.)'),
  placementV2: z.any().optional().describe('Placement configuration'),
  billingEvent: z.string().optional().describe('Billing event type'),
  bidMicro: z.number().optional().describe('Bid amount in micro-currency'),
  dailyBudgetMicro: z.number().optional().describe('Daily budget in micro-currency'),
  lifetimeBudgetMicro: z.number().optional().describe('Lifetime budget in micro-currency'),
  startTime: z.string().optional().describe('Start time'),
  endTime: z.string().optional().describe('End time'),
  optimizationGoal: z.string().optional().describe('Optimization goal'),
  deliveryConstraint: z.string().optional().describe('Delivery constraint'),
  bidStrategy: z.string().optional().describe('Bid strategy'),
  pixelId: z.string().optional().describe('Associated Snap Pixel ID'),
  pacingType: z.string().optional().describe('Pacing type'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let manageAdSquad = SlateTool.create(spec, {
  name: 'Manage Ad Squad',
  key: 'manage_ad_squad',
  description: `Create or update a Snapchat ad squad (ad set) under a campaign. Ad squads define targeting, budget, bid, and schedule for a group of ads. To create, provide a **campaignId** and ad squad properties. To update, also provide an **adSquadId**.`,
  instructions: [
    'Budget and bid values are in micro-currency (1 USD = 1,000,000 micro-currency).',
    'Valid statuses: ACTIVE, PAUSED.',
    'For creation, campaignId, name, type, and billing_event are typically required.'
  ]
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID this ad squad belongs to'),
      adSquadId: z
        .string()
        .optional()
        .describe('Ad squad ID to update (omit to create a new ad squad)'),
      name: z.string().optional().describe('Ad squad name'),
      status: z.enum(['ACTIVE', 'PAUSED']).optional().describe('Ad squad status'),
      type: z.string().optional().describe('Ad squad type (e.g., SNAP_ADS)'),
      billingEvent: z.string().optional().describe('Billing event (e.g., IMPRESSION, SWIPE)'),
      bidMicro: z.number().optional().describe('Bid amount in micro-currency'),
      dailyBudgetMicro: z.number().optional().describe('Daily budget in micro-currency'),
      lifetimeBudgetMicro: z.number().optional().describe('Lifetime budget in micro-currency'),
      startTime: z.string().optional().describe('Start time in ISO 8601 format'),
      endTime: z.string().optional().describe('End time in ISO 8601 format'),
      optimizationGoal: z
        .string()
        .optional()
        .describe('Optimization goal (e.g., IMPRESSIONS, SWIPES, APP_INSTALLS, CONVERSIONS)'),
      deliveryConstraint: z
        .string()
        .optional()
        .describe('Delivery constraint (DAILY_BUDGET or LIFETIME_BUDGET)'),
      bidStrategy: z
        .string()
        .optional()
        .describe('Bid strategy (AUTO_BID, LOWEST_COST_WITH_MAX_BID, TARGET_COST)'),
      autoBid: z.boolean().optional().describe('Whether auto bid is enabled'),
      targetBid: z.boolean().optional().describe('Whether target bid is enabled'),
      placementV2: z
        .any()
        .optional()
        .describe('Placement v2 object, e.g. { config: "AUTOMATIC" }'),
      pixelId: z.string().optional().describe('Snap Pixel ID to associate with the ad squad'),
      pacingType: z.string().optional().describe('Pacing type (STANDARD or ACCELERATED)'),
      conversionWindow: z
        .string()
        .optional()
        .describe('Delivery optimization conversion window'),
      targeting: z
        .any()
        .optional()
        .describe('Targeting spec object with demographics, geos, interests, devices, etc.')
    })
  )
  .output(adSquadOutputSchema)
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let { campaignId, adSquadId, ...fields } = ctx.input;

    if (!adSquadId) {
      if (!fields.name) throw snapchatServiceError('name is required to create an ad squad.');
      if (!fields.type) throw snapchatServiceError('type is required to create an ad squad.');
      if (!fields.billingEvent) {
        throw snapchatServiceError('billingEvent is required to create an ad squad.');
      }
      if (!fields.optimizationGoal) {
        throw snapchatServiceError('optimizationGoal is required to create an ad squad.');
      }
      if (!fields.targeting) {
        throw snapchatServiceError('targeting is required to create an ad squad.');
      }
      if (!fields.placementV2) {
        throw snapchatServiceError('placementV2 is required to create an ad squad.');
      }
      if (!fields.bidStrategy) {
        throw snapchatServiceError('bidStrategy is required to create an ad squad.');
      }
      if (!fields.dailyBudgetMicro && !fields.lifetimeBudgetMicro) {
        throw snapchatServiceError(
          'Either dailyBudgetMicro or lifetimeBudgetMicro is required to create an ad squad.'
        );
      }
    }

    let adSquadData: Record<string, any> = {};
    if (adSquadId) adSquadData.id = adSquadId;
    if (fields.name) adSquadData.name = fields.name;
    if (fields.status) adSquadData.status = fields.status;
    if (fields.type) adSquadData.type = fields.type;
    if (fields.billingEvent) adSquadData.billing_event = fields.billingEvent;
    if (fields.bidMicro !== undefined) adSquadData.bid_micro = fields.bidMicro;
    if (fields.dailyBudgetMicro !== undefined)
      adSquadData.daily_budget_micro = fields.dailyBudgetMicro;
    if (fields.lifetimeBudgetMicro !== undefined)
      adSquadData.lifetime_budget_micro = fields.lifetimeBudgetMicro;
    if (fields.startTime) adSquadData.start_time = fields.startTime;
    if (fields.endTime) adSquadData.end_time = fields.endTime;
    if (fields.optimizationGoal) adSquadData.optimization_goal = fields.optimizationGoal;
    if (fields.deliveryConstraint) adSquadData.delivery_constraint = fields.deliveryConstraint;
    if (fields.bidStrategy) adSquadData.bid_strategy = fields.bidStrategy;
    if (fields.autoBid !== undefined) adSquadData.auto_bid = fields.autoBid;
    if (fields.targetBid !== undefined) adSquadData.target_bid = fields.targetBid;
    if (fields.placementV2) adSquadData.placement_v2 = fields.placementV2;
    if (fields.pixelId) adSquadData.pixel_id = fields.pixelId;
    if (fields.pacingType) adSquadData.pacing_type = fields.pacingType;
    if (fields.conversionWindow) adSquadData.conversion_window = fields.conversionWindow;
    if (fields.targeting) adSquadData.targeting = fields.targeting;

    let result: any;
    if (adSquadId) {
      result = await client.updateAdSquad(campaignId, adSquadData);
    } else {
      result = await client.createAdSquad(campaignId, adSquadData);
    }

    if (!result) {
      throw snapchatServiceError('Snapchat did not return an ad squad in the API response.');
    }

    let output = {
      adSquadId: result.id,
      campaignId: result.campaign_id,
      name: result.name,
      status: result.status,
      type: result.type,
      placementV2: result.placement_v2,
      billingEvent: result.billing_event,
      bidMicro: result.bid_micro,
      dailyBudgetMicro: result.daily_budget_micro,
      lifetimeBudgetMicro: result.lifetime_budget_micro,
      startTime: result.start_time,
      endTime: result.end_time,
      optimizationGoal: result.optimization_goal,
      deliveryConstraint: result.delivery_constraint,
      bidStrategy: result.bid_strategy,
      pixelId: result.pixel_id,
      pacingType: result.pacing_type,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    let action = adSquadId ? 'Updated' : 'Created';
    return {
      output,
      message: `${action} ad squad **${output.name}** (${output.adSquadId}).`
    };
  })
  .build();
