import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetaAdsClient } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.string().describe('Campaign ID'),
  name: z.string().optional().describe('Campaign name'),
  objective: z.string().optional().describe('Campaign objective'),
  status: z.string().optional().describe('Campaign status'),
  dailyBudget: z.string().optional().describe('Daily budget in cents'),
  lifetimeBudget: z.string().optional().describe('Lifetime budget in cents'),
  budgetRemaining: z.string().optional().describe('Remaining budget'),
  createdTime: z.string().optional().describe('Creation timestamp'),
  updatedTime: z.string().optional().describe('Last update timestamp'),
  startTime: z.string().optional().describe('Start time'),
  stopTime: z.string().optional().describe('Stop time'),
  specialAdCategories: z.array(z.string()).optional().describe('Special ad categories'),
  buyingType: z.string().optional().describe('Buying type')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve campaigns from the configured ad account. Supports pagination and filtering by status. Use this to browse existing campaigns and get their IDs for further operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      statusFilter: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'])
        .optional()
        .describe('Filter campaigns by status'),
      limit: z.number().optional().describe('Max number of campaigns to return (default 25)'),
      afterCursor: z
        .string()
        .optional()
        .describe('Pagination cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignSchema),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
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

    let result = await client.getCampaigns({
      limit: ctx.input.limit,
      after: ctx.input.afterCursor,
      filtering
    });

    let campaigns = (result.data || []).map((c: any) => ({
      campaignId: c.id,
      name: c.name,
      objective: c.objective,
      status: c.status,
      dailyBudget: c.daily_budget,
      lifetimeBudget: c.lifetime_budget,
      budgetRemaining: c.budget_remaining,
      createdTime: c.created_time,
      updatedTime: c.updated_time,
      startTime: c.start_time,
      stopTime: c.stop_time,
      specialAdCategories: c.special_ad_categories,
      buyingType: c.buying_type
    }));

    return {
      output: {
        campaigns,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${campaigns.length}** campaigns.`
    };
  })
  .build();

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve detailed information about a specific campaign by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The campaign ID to retrieve')
    })
  )
  .output(campaignSchema)
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let c = await client.getCampaign(ctx.input.campaignId);

    return {
      output: {
        campaignId: c.id,
        name: c.name,
        objective: c.objective,
        status: c.status,
        dailyBudget: c.daily_budget,
        lifetimeBudget: c.lifetime_budget,
        budgetRemaining: c.budget_remaining,
        createdTime: c.created_time,
        updatedTime: c.updated_time,
        startTime: c.start_time,
        stopTime: c.stop_time,
        specialAdCategories: c.special_ad_categories,
        buyingType: c.buying_type
      },
      message: `Retrieved campaign **${c.name}** (${c.id}) with status **${c.status}**.`
    };
  })
  .build();

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new advertising campaign. Campaigns are the top-level container in Meta's ad hierarchy defining the objective. After creating a campaign, create ad sets and ads within it.`,
  instructions: [
    'The specialAdCategories field is required. Pass an empty array if no special categories apply.',
    'Budget can be set at the campaign level (with campaign budget optimization) or at the ad set level.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Campaign name'),
      objective: z
        .enum([
          'OUTCOME_AWARENESS',
          'OUTCOME_ENGAGEMENT',
          'OUTCOME_LEADS',
          'OUTCOME_SALES',
          'OUTCOME_TRAFFIC',
          'OUTCOME_APP_PROMOTION'
        ])
        .describe('Campaign objective'),
      status: z
        .enum(['ACTIVE', 'PAUSED'])
        .default('PAUSED')
        .describe('Initial campaign status'),
      specialAdCategories: z
        .array(
          z.enum(['NONE', 'EMPLOYMENT', 'HOUSING', 'CREDIT', 'ISSUES_ELECTIONS_POLITICS'])
        )
        .default([])
        .describe('Special ad categories (pass empty array if none)'),
      dailyBudget: z
        .string()
        .optional()
        .describe(
          'Daily budget in cents (e.g., "5000" for $50.00). Requires campaign budget optimization.'
        ),
      lifetimeBudget: z
        .string()
        .optional()
        .describe(
          'Lifetime budget in cents. Requires campaign budget optimization and end date.'
        ),
      buyingType: z
        .enum(['AUCTION', 'RESERVED'])
        .optional()
        .describe('Buying type (default AUCTION)'),
      bidStrategy: z
        .enum(['LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'COST_CAP'])
        .optional()
        .describe('Bid strategy for campaign budget optimization')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the newly created campaign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let params: Record<string, any> = {
      name: ctx.input.name,
      objective: ctx.input.objective,
      status: ctx.input.status,
      special_ad_categories: JSON.stringify(ctx.input.specialAdCategories)
    };

    if (ctx.input.dailyBudget) params.daily_budget = ctx.input.dailyBudget;
    if (ctx.input.lifetimeBudget) params.lifetime_budget = ctx.input.lifetimeBudget;
    if (ctx.input.buyingType) params.buying_type = ctx.input.buyingType;
    if (ctx.input.bidStrategy) params.bid_strategy = ctx.input.bidStrategy;

    let result = await client.createCampaign(params);

    return {
      output: {
        campaignId: result.id
      },
      message: `Created campaign **${ctx.input.name}** with ID \`${result.id}\`.`
    };
  })
  .build();

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update an existing campaign's settings including name, status, budget, and bid strategy. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to update'),
      name: z.string().optional().describe('New campaign name'),
      status: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'])
        .optional()
        .describe('New campaign status'),
      dailyBudget: z.string().optional().describe('New daily budget in cents'),
      lifetimeBudget: z.string().optional().describe('New lifetime budget in cents'),
      bidStrategy: z
        .enum(['LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'COST_CAP'])
        .optional()
        .describe('New bid strategy')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let params: Record<string, any> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.dailyBudget) params.daily_budget = ctx.input.dailyBudget;
    if (ctx.input.lifetimeBudget) params.lifetime_budget = ctx.input.lifetimeBudget;
    if (ctx.input.bidStrategy) params.bid_strategy = ctx.input.bidStrategy;

    let result = await client.updateCampaign(ctx.input.campaignId, params);

    return {
      output: {
        success: result.success !== false
      },
      message: `Updated campaign \`${ctx.input.campaignId}\`.`
    };
  })
  .build();

export let deleteCampaign = SlateTool.create(spec, {
  name: 'Delete Campaign',
  key: 'delete_campaign',
  description: `Delete a campaign. This sets the campaign status to DELETED. Deleted campaigns cannot be reactivated.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to delete')
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

    let result = await client.deleteCampaign(ctx.input.campaignId);

    return {
      output: {
        success: result.success !== false
      },
      message: `Deleted campaign \`${ctx.input.campaignId}\`.`
    };
  })
  .build();
