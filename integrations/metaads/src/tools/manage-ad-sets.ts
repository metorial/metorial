import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetaAdsClient } from '../lib/client';
import { metaAdsServiceError } from '../lib/errors';
import { spec } from '../spec';

let adSetSchema = z.object({
  adSetId: z.string().describe('Ad set ID'),
  name: z.string().optional().describe('Ad set name'),
  campaignId: z.string().optional().describe('Parent campaign ID'),
  status: z.string().optional().describe('Ad set status'),
  dailyBudget: z.string().optional().describe('Daily budget in cents'),
  lifetimeBudget: z.string().optional().describe('Lifetime budget in cents'),
  budgetRemaining: z.string().optional().describe('Remaining budget'),
  targeting: z.any().optional().describe('Targeting specification'),
  optimizationGoal: z.string().optional().describe('Optimization goal'),
  billingEvent: z.string().optional().describe('Billing event'),
  bidAmount: z.string().optional().describe('Bid amount'),
  startTime: z.string().optional().describe('Start time'),
  endTime: z.string().optional().describe('End time'),
  createdTime: z.string().optional().describe('Creation timestamp'),
  updatedTime: z.string().optional().describe('Last update timestamp')
});

export let listAdSets = SlateTool.create(spec, {
  name: 'List Ad Sets',
  key: 'list_ad_sets',
  description: `Retrieve ad sets from the ad account or a specific campaign. Ad sets define targeting, budget, schedule, and optimization settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe(
          'Filter ad sets by campaign ID. If omitted, returns ad sets from the entire ad account.'
        ),
      statusFilter: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'])
        .optional()
        .describe('Filter by status'),
      limit: z.number().optional().describe('Max number of ad sets to return (default 25)'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      adSets: z.array(adSetSchema),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let filtering = ctx.input.statusFilter
      ? [{ field: 'effective_status', operator: 'IN', value: `["${ctx.input.statusFilter}"]` }]
      : undefined;

    let result = await client.getAdSets({
      campaignId: ctx.input.campaignId,
      limit: ctx.input.limit,
      after: ctx.input.afterCursor,
      filtering
    });

    let adSets = (result.data || []).map((a: any) => ({
      adSetId: a.id,
      name: a.name,
      campaignId: a.campaign_id,
      status: a.status,
      dailyBudget: a.daily_budget,
      lifetimeBudget: a.lifetime_budget,
      budgetRemaining: a.budget_remaining,
      targeting: a.targeting,
      optimizationGoal: a.optimization_goal,
      billingEvent: a.billing_event,
      bidAmount: a.bid_amount,
      startTime: a.start_time,
      endTime: a.end_time,
      createdTime: a.created_time,
      updatedTime: a.updated_time
    }));

    return {
      output: {
        adSets,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${adSets.length}** ad sets.`
    };
  })
  .build();

export let getAdSet = SlateTool.create(spec, {
  name: 'Get Ad Set',
  key: 'get_ad_set',
  description: `Retrieve detailed information about a specific ad set including its targeting configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adSetId: z.string().describe('The ad set ID to retrieve')
    })
  )
  .output(adSetSchema)
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let a = await client.getAdSet(ctx.input.adSetId);

    return {
      output: {
        adSetId: a.id,
        name: a.name,
        campaignId: a.campaign_id,
        status: a.status,
        dailyBudget: a.daily_budget,
        lifetimeBudget: a.lifetime_budget,
        budgetRemaining: a.budget_remaining,
        targeting: a.targeting,
        optimizationGoal: a.optimization_goal,
        billingEvent: a.billing_event,
        bidAmount: a.bid_amount,
        startTime: a.start_time,
        endTime: a.end_time,
        createdTime: a.created_time,
        updatedTime: a.updated_time
      },
      message: `Retrieved ad set **${a.name}** (${a.id}) with status **${a.status}**.`
    };
  })
  .build();

export let createAdSet = SlateTool.create(spec, {
  name: 'Create Ad Set',
  key: 'create_ad_set',
  description: `Create a new ad set within a campaign. Ad sets control targeting, budget, schedule, and optimization. The targeting object follows Meta's targeting spec format.`,
  instructions: [
    'The targeting object must follow Meta targeting spec format. At minimum, include geo_locations with countries.',
    'Either dailyBudget or lifetimeBudget is required unless the parent campaign uses campaign budget optimization.',
    'When using lifetimeBudget, an endTime is required.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Ad set name'),
      campaignId: z.string().describe('Parent campaign ID'),
      status: z.enum(['ACTIVE', 'PAUSED']).default('PAUSED').describe('Initial status'),
      targeting: z
        .record(z.string(), z.any())
        .describe(
          'Targeting specification object (e.g., { geo_locations: { countries: ["US"] }, age_min: 18, age_max: 65 })'
        ),
      optimizationGoal: z
        .enum([
          'NONE',
          'APP_INSTALLS',
          'AD_RECALL_LIFT',
          'ENGAGED_USERS',
          'EVENT_RESPONSES',
          'IMPRESSIONS',
          'LEAD_GENERATION',
          'QUALITY_LEAD',
          'LINK_CLICKS',
          'OFFSITE_CONVERSIONS',
          'PAGE_LIKES',
          'POST_ENGAGEMENT',
          'QUALITY_CALL',
          'REACH',
          'LANDING_PAGE_VIEWS',
          'VALUE',
          'THRUPLAY',
          'CONVERSATIONS',
          'DERIVED_EVENTS'
        ])
        .describe('Optimization goal'),
      billingEvent: z
        .enum(['IMPRESSIONS', 'LINK_CLICKS', 'POST_ENGAGEMENT', 'THRUPLAY'])
        .default('IMPRESSIONS')
        .describe('Billing event'),
      dailyBudget: z.string().optional().describe('Daily budget in cents'),
      lifetimeBudget: z.string().optional().describe('Lifetime budget in cents'),
      bidAmount: z.string().optional().describe('Bid amount in cents (for manual bidding)'),
      startTime: z.string().optional().describe('Start time in ISO 8601 format'),
      endTime: z
        .string()
        .optional()
        .describe('End time in ISO 8601 format (required for lifetime budget)'),
      promotedObject: z
        .record(z.string(), z.any())
        .optional()
        .describe('Promoted object (e.g., { pixel_id: "123", custom_event_type: "PURCHASE" })')
    })
  )
  .output(
    z.object({
      adSetId: z.string().describe('ID of the newly created ad set')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.dailyBudget && ctx.input.lifetimeBudget) {
      throw metaAdsServiceError('Provide either dailyBudget or lifetimeBudget, not both.');
    }

    if (ctx.input.lifetimeBudget && !ctx.input.endTime) {
      throw metaAdsServiceError('endTime is required when lifetimeBudget is provided.');
    }

    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let params: Record<string, any> = {
      name: ctx.input.name,
      campaign_id: ctx.input.campaignId,
      status: ctx.input.status,
      targeting: JSON.stringify(ctx.input.targeting),
      optimization_goal: ctx.input.optimizationGoal,
      billing_event: ctx.input.billingEvent
    };

    if (ctx.input.dailyBudget) params.daily_budget = ctx.input.dailyBudget;
    if (ctx.input.lifetimeBudget) params.lifetime_budget = ctx.input.lifetimeBudget;
    if (ctx.input.bidAmount) params.bid_amount = ctx.input.bidAmount;
    if (ctx.input.startTime) params.start_time = ctx.input.startTime;
    if (ctx.input.endTime) params.end_time = ctx.input.endTime;
    if (ctx.input.promotedObject)
      params.promoted_object = JSON.stringify(ctx.input.promotedObject);

    let result = await client.createAdSet(params);

    return {
      output: {
        adSetId: result.id
      },
      message: `Created ad set **${ctx.input.name}** with ID \`${result.id}\`.`
    };
  })
  .build();

export let updateAdSet = SlateTool.create(spec, {
  name: 'Update Ad Set',
  key: 'update_ad_set',
  description: `Update an existing ad set's settings including targeting, budget, schedule, and status. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      adSetId: z.string().describe('ID of the ad set to update'),
      name: z.string().optional().describe('New name'),
      status: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'])
        .optional()
        .describe('New status'),
      targeting: z
        .record(z.string(), z.any())
        .optional()
        .describe('New targeting specification'),
      dailyBudget: z.string().optional().describe('New daily budget in cents'),
      lifetimeBudget: z.string().optional().describe('New lifetime budget in cents'),
      bidAmount: z.string().optional().describe('New bid amount in cents'),
      endTime: z.string().optional().describe('New end time'),
      optimizationGoal: z.string().optional().describe('New optimization goal')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    if (
      !ctx.input.name &&
      !ctx.input.status &&
      !ctx.input.targeting &&
      !ctx.input.dailyBudget &&
      !ctx.input.lifetimeBudget &&
      !ctx.input.bidAmount &&
      !ctx.input.endTime &&
      !ctx.input.optimizationGoal
    ) {
      throw metaAdsServiceError('Provide at least one ad set field to update.');
    }

    if (ctx.input.dailyBudget && ctx.input.lifetimeBudget) {
      throw metaAdsServiceError('Provide either dailyBudget or lifetimeBudget, not both.');
    }

    if (ctx.input.lifetimeBudget && !ctx.input.endTime) {
      throw metaAdsServiceError('endTime is required when lifetimeBudget is provided.');
    }

    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let params: Record<string, any> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.targeting) params.targeting = JSON.stringify(ctx.input.targeting);
    if (ctx.input.dailyBudget) params.daily_budget = ctx.input.dailyBudget;
    if (ctx.input.lifetimeBudget) params.lifetime_budget = ctx.input.lifetimeBudget;
    if (ctx.input.bidAmount) params.bid_amount = ctx.input.bidAmount;
    if (ctx.input.endTime) params.end_time = ctx.input.endTime;
    if (ctx.input.optimizationGoal) params.optimization_goal = ctx.input.optimizationGoal;

    let result = await client.updateAdSet(ctx.input.adSetId, params);

    return {
      output: {
        success: result.success !== false
      },
      message: `Updated ad set \`${ctx.input.adSetId}\`.`
    };
  })
  .build();

export let deleteAdSet = SlateTool.create(spec, {
  name: 'Delete Ad Set',
  key: 'delete_ad_set',
  description: `Delete an ad set. This sets the ad set status to DELETED.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      adSetId: z.string().describe('ID of the ad set to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.deleteAdSet(ctx.input.adSetId);

    return {
      output: {
        success: result.success !== false
      },
      message: `Deleted ad set \`${ctx.input.adSetId}\`.`
    };
  })
  .build();
