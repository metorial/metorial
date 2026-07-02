import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokBusinessClient } from '../lib/client';
import { spec } from '../spec';

export let createAdGroup = SlateTool.create(spec, {
  name: 'Create Ad Group',
  key: 'create_ad_group',
  description: `Create a new ad group within a TikTok Ads campaign. Configure targeting (location, age, gender), budget, schedule, bidding strategy, and optimization goal.`,
  instructions: [
    'A campaign must exist before creating an ad group under it.',
    "Use location codes from TikTok's /tool/region/ endpoint for geo-targeting."
  ]
})
  .input(
    z.object({
      advertiserId: z.string().describe('TikTok Ads advertiser/account ID.'),
      campaignId: z.string().describe('Parent campaign ID.'),
      adGroupName: z.string().describe('Name for the ad group.'),
      placementType: z
        .string()
        .optional()
        .describe('Placement type (e.g. PLACEMENT_TYPE_NORMAL, PLACEMENT_TYPE_AUTOMATIC).'),
      placement: z
        .array(z.string())
        .optional()
        .describe('Placements (e.g. ["PLACEMENT_TIKTOK"]).'),
      budget: z.number().optional().describe('Ad group budget amount.'),
      budgetMode: z
        .string()
        .optional()
        .describe('Budget mode: BUDGET_MODE_DAY, BUDGET_MODE_TOTAL, or BUDGET_MODE_INFINITE.'),
      scheduleType: z
        .string()
        .optional()
        .describe('Schedule type: SCHEDULE_START_END or SCHEDULE_FROM_NOW.'),
      scheduleStartTime: z
        .string()
        .optional()
        .describe('Start time in YYYY-MM-DD HH:MM:SS format (UTC+0).'),
      scheduleEndTime: z
        .string()
        .optional()
        .describe(
          'End time in YYYY-MM-DD HH:MM:SS format (UTC+0). Required for SCHEDULE_START_END.'
        ),
      optimizeGoal: z
        .string()
        .optional()
        .describe('Optimization goal (e.g. REACH, CLICK, CONVERT).'),
      billingEvent: z.string().optional().describe('Billing event (e.g. CPM, CPC, OCPM).'),
      bidType: z
        .string()
        .optional()
        .describe('Bid type (e.g. BID_TYPE_NO_BID, BID_TYPE_CUSTOM).'),
      bid: z.number().optional().describe('Bid amount when using custom bidding.'),
      pacing: z
        .string()
        .optional()
        .describe('Pacing mode (e.g. PACING_MODE_SMOOTH, PACING_MODE_FAST).'),
      location: z
        .array(z.string())
        .optional()
        .describe('Location/region codes for targeting.'),
      gender: z
        .string()
        .optional()
        .describe('Gender targeting (e.g. GENDER_UNLIMITED, GENDER_MALE, GENDER_FEMALE).'),
      age: z
        .array(z.string())
        .optional()
        .describe('Age groups (e.g. ["AGE_18_24", "AGE_25_34"]).')
    })
  )
  .output(
    z.object({
      adGroupId: z.string().describe('ID of the newly created ad group.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TikTokBusinessClient({ token: ctx.auth.token });

    let result = await client.createAdGroup({
      advertiserId: ctx.input.advertiserId,
      campaignId: ctx.input.campaignId,
      adGroupName: ctx.input.adGroupName,
      placementType: ctx.input.placementType,
      placement: ctx.input.placement,
      budget: ctx.input.budget,
      budgetMode: ctx.input.budgetMode,
      scheduleType: ctx.input.scheduleType,
      scheduleStartTime: ctx.input.scheduleStartTime,
      scheduleEndTime: ctx.input.scheduleEndTime,
      optimizeGoal: ctx.input.optimizeGoal,
      billingEvent: ctx.input.billingEvent,
      bidType: ctx.input.bidType,
      bid: ctx.input.bid,
      pacing: ctx.input.pacing,
      location: ctx.input.location,
      gender: ctx.input.gender,
      age: ctx.input.age
    });

    return {
      output: { adGroupId: result.adGroupId },
      message: `Ad group **${ctx.input.adGroupName}** created with ID \`${result.adGroupId}\` under campaign \`${ctx.input.campaignId}\`.`
    };
  })
  .build();
