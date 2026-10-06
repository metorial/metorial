import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, continuation, urn } from '../lib/client';
import { accountIdField } from '../lib/schemas';
import { spec } from '../spec';

let budgetSchema = z.object({
  amount: z.string().describe('Budget amount as string (e.g., "50.00")'),
  currencyCode: z.string().describe('ISO currency code (e.g., "USD")')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List advertising campaigns within a LinkedIn ad account. Optionally filter by campaign group or status. Returns campaign details including objective, budget, and serving status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(anyOf('r_ads', 'rw_ads'))
  .input(
    z.object({
      accountId: accountIdField,
      campaignGroupId: z.string().optional().describe('Filter by campaign group ID'),
      statuses: z
        .array(z.string())
        .optional()
        .describe('Filter by statuses (e.g., ["ACTIVE", "PAUSED"])'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      nextPageToken: z
        .string()
        .optional()
        .describe('Continuation token for pageToken with the same filters'),
      campaigns: z.array(
        z.object({
          campaignId: z.number().describe('Numeric ID of the campaign'),
          name: z.string().describe('Campaign name'),
          status: z.string().describe('Campaign status'),
          objectiveType: z.string().describe('Campaign objective type'),
          type: z.string().describe('Campaign type (e.g., SPONSORED_UPDATES)'),
          costType: z.string().describe('Cost type (e.g., CPM, CPC)'),
          dailyBudget: budgetSchema.optional().describe('Daily budget'),
          totalBudget: budgetSchema.optional().describe('Total budget'),
          campaignGroup: z.string().describe('Campaign group URN'),
          account: z.string().describe('Account URN'),
          servingStatuses: z.array(z.string()).optional().describe('Serving statuses')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCampaigns(ctx.input.accountId, {
      campaignGroupId: ctx.input.campaignGroupId,
      status: ctx.input.statuses,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let campaigns = result.elements.map(campaign => ({
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objectiveType: campaign.objectiveType,
      type: campaign.type,
      costType: campaign.costType,
      dailyBudget: campaign.dailyBudget,
      totalBudget: campaign.totalBudget,
      campaignGroup: campaign.campaignGroup,
      account: campaign.account,
      servingStatuses: campaign.servingStatuses
    }));

    return {
      output: { campaigns, nextPageToken: continuation(result) },
      message: `Found **${campaigns.length}** campaign(s).`
    };
  })
  .build();

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve detailed information about a specific LinkedIn campaign including its configuration, targeting, budget, and status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(anyOf('r_ads', 'rw_ads'))
  .input(
    z.object({
      campaignId: z.string().describe('Numeric ID of the campaign'),
      accountId: accountIdField
        .optional()
        .describe(
          'Authorized account ID from list_ad_accounts. Omit only for bounded, unambiguous read-only account discovery.'
        )
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Numeric ID of the campaign'),
      name: z.string().describe('Campaign name'),
      status: z.string().describe('Campaign status'),
      objectiveType: z.string().describe('Campaign objective; empty if the provider omits it'),
      type: z.string().describe('Campaign type'),
      costType: z.string().describe('Cost type'),
      dailyBudget: budgetSchema.optional(),
      totalBudget: budgetSchema.optional(),
      unitCost: budgetSchema.optional().describe('Bid amount'),
      campaignGroup: z.string().describe('Campaign group URN'),
      account: z.string().describe('Account URN'),
      targetingCriteria: z.any().optional().describe('Targeting criteria configuration'),
      runSchedule: z
        .object({
          start: z.number().optional(),
          end: z.number().optional()
        })
        .optional()
        .describe('Scheduled run dates (epoch ms)'),
      creativeSelection: z.string().optional(),
      format: z.string().optional().describe('Ad format'),
      optimizationTargetType: z.string().optional(),
      audienceExpansionEnabled: z.boolean().optional(),
      servingStatuses: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let campaign = await client.getCampaign(ctx.input.campaignId, ctx.input.accountId);

    return {
      output: {
        campaignId: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objectiveType: campaign.objectiveType,
        type: campaign.type,
        costType: campaign.costType,
        dailyBudget: campaign.dailyBudget,
        totalBudget: campaign.totalBudget,
        unitCost: campaign.unitCost,
        campaignGroup: campaign.campaignGroup,
        account: campaign.account,
        targetingCriteria: campaign.targetingCriteria,
        runSchedule: campaign.runSchedule,
        creativeSelection: campaign.creativeSelection,
        format: campaign.format,
        optimizationTargetType: campaign.optimizationTargetType,
        audienceExpansionEnabled: campaign.audienceExpansionEnabled,
        servingStatuses: campaign.servingStatuses
      },
      message: `Retrieved campaign **${campaign.name}** (ID: ${campaign.id}, Status: ${campaign.status}, Objective: ${campaign.objectiveType}).`
    };
  })
  .build();

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new LinkedIn advertising campaign. Requires specifying the account, campaign group, objective, cost type, and budget. Supports various campaign types including Sponsored Content, Text Ads, Message Ads, and more.`,
  instructions: [
    'The account and campaignGroup must be specified as URNs (e.g., "urn:li:sponsoredAccount:123456").',
    'Common objective types: BRAND_AWARENESS, WEBSITE_VISITS, ENGAGEMENT, VIDEO_VIEWS, LEAD_GENERATION, WEBSITE_CONVERSIONS, JOB_APPLICANTS.',
    'Common cost types: CPM (cost per mille), CPC (cost per click), CPV (cost per view).',
    'Common campaign types: SPONSORED_UPDATES, SPONSORED_INMAILS, TEXT_AD, DYNAMIC.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(anyOf('rw_ads'))
  .input(
    z.object({
      accountId: accountIdField,
      campaignGroupId: z.string().describe('Numeric ID of the campaign group'),
      name: z.string().describe('Campaign name'),
      objectiveType: z
        .string()
        .describe(
          'Campaign objective (e.g., BRAND_AWARENESS, WEBSITE_VISITS, LEAD_GENERATION)'
        ),
      type: z
        .string()
        .describe('Campaign type (e.g., SPONSORED_UPDATES, TEXT_AD, SPONSORED_INMAILS)'),
      costType: z.string().describe('Cost type (e.g., CPM, CPC, CPV)'),
      status: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'])
        .default('DRAFT')
        .describe('Initial campaign status'),
      dailyBudget: budgetSchema.optional().describe('Daily budget'),
      totalBudget: budgetSchema.optional().describe('Total campaign budget'),
      unitCost: budgetSchema.optional().describe('Bid amount per unit'),
      runScheduleStart: z.number().optional().describe('Start date as epoch milliseconds'),
      runScheduleEnd: z.number().optional().describe('End date as epoch milliseconds'),
      locale: z
        .object({
          country: z.string().describe('ISO country code (e.g., "US")'),
          language: z.string().describe('ISO language code (e.g., "en")')
        })
        .optional()
        .describe('Locale for the campaign'),
      audienceExpansionEnabled: z.boolean().optional().describe('Enable audience expansion'),
      offsiteDeliveryEnabled: z.boolean().optional().describe('Enable offsite delivery'),
      optimizationTargetType: z
        .string()
        .optional()
        .describe('Optimization target (e.g., MAX_CLICK, MAX_IMPRESSION, MAX_CONVERSION)'),
      targetingCriteria: z
        .any()
        .optional()
        .describe('Current targeting criteria JSON object using supported geographic URNs'),
      associatedEntity: z
        .string()
        .optional()
        .describe(
          'Advertiser organization or person URN; required for Sponsored Content, Dynamic Ads and Lead Gen Forms'
        ),
      politicalIntent: z
        .enum(['POLITICAL', 'NOT_POLITICAL', 'NOT_DECLARED'])
        .optional()
        .describe(
          'Advertiser declaration. Do not infer NOT_POLITICAL; EU targeting requires explicit advertiser confirmation.'
        )
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the created campaign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {
      account: urn(ctx.input.accountId, 'sponsoredAccount'),
      campaignGroup: urn(ctx.input.campaignGroupId, 'sponsoredCampaignGroup'),
      name: ctx.input.name,
      objectiveType: ctx.input.objectiveType,
      type: ctx.input.type,
      costType: ctx.input.costType,
      status: ctx.input.status,
      politicalIntent: ctx.input.politicalIntent ?? 'NOT_DECLARED'
    };

    if (ctx.input.dailyBudget) data.dailyBudget = ctx.input.dailyBudget;
    if (ctx.input.totalBudget) data.totalBudget = ctx.input.totalBudget;
    if (ctx.input.unitCost) data.unitCost = ctx.input.unitCost;
    if (ctx.input.locale) data.locale = ctx.input.locale;
    if (ctx.input.associatedEntity !== undefined)
      data.associatedEntity = ctx.input.associatedEntity;
    if (ctx.input.audienceExpansionEnabled !== undefined)
      data.audienceExpansionEnabled = ctx.input.audienceExpansionEnabled;
    if (ctx.input.offsiteDeliveryEnabled !== undefined)
      data.offsiteDeliveryEnabled = ctx.input.offsiteDeliveryEnabled;
    if (ctx.input.optimizationTargetType)
      data.optimizationTargetType = ctx.input.optimizationTargetType;
    if (ctx.input.targetingCriteria) data.targetingCriteria = ctx.input.targetingCriteria;

    if (ctx.input.runScheduleStart !== undefined || ctx.input.runScheduleEnd !== undefined) {
      data.runSchedule = { start: ctx.input.runScheduleStart, end: ctx.input.runScheduleEnd };
    }

    let campaignId = await client.createCampaign(data);

    return {
      output: { campaignId },
      message: 'LinkedIn confirmed the requested operation.'
    };
  })
  .build();

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update an existing LinkedIn campaign's configuration, including status, name, budget, schedule, bid amount, and targeting. Only provided fields will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(anyOf('rw_ads'))
  .input(
    z.object({
      campaignId: z.string().describe('Numeric ID of the campaign to update'),
      accountId: accountIdField
        .optional()
        .describe(
          'Authorized account ID from list_ad_accounts. Omit only for bounded, unambiguous read-only account discovery.'
        ),
      name: z.string().optional().describe('New campaign name'),
      status: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'])
        .optional()
        .describe('New status'),
      dailyBudget: budgetSchema.optional().describe('New daily budget'),
      totalBudget: budgetSchema.optional().describe('New total budget'),
      unitCost: budgetSchema.optional().describe('New bid amount'),
      runScheduleStart: z.number().optional().describe('New start date as epoch milliseconds'),
      runScheduleEnd: z.number().optional().describe('New end date as epoch milliseconds'),
      audienceExpansionEnabled: z
        .boolean()
        .optional()
        .describe('Enable/disable audience expansion'),
      optimizationTargetType: z.string().optional().describe('New optimization target'),
      targetingCriteria: z.any().optional().describe('New targeting criteria JSON')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let patch: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) patch.name = ctx.input.name;
    if (ctx.input.status) patch.status = ctx.input.status;
    if (ctx.input.dailyBudget) patch.dailyBudget = ctx.input.dailyBudget;
    if (ctx.input.totalBudget) patch.totalBudget = ctx.input.totalBudget;
    if (ctx.input.unitCost) patch.unitCost = ctx.input.unitCost;
    if (ctx.input.audienceExpansionEnabled !== undefined)
      patch.audienceExpansionEnabled = ctx.input.audienceExpansionEnabled;
    if (ctx.input.optimizationTargetType)
      patch.optimizationTargetType = ctx.input.optimizationTargetType;
    if (ctx.input.targetingCriteria) patch.targetingCriteria = ctx.input.targetingCriteria;

    if (ctx.input.runScheduleStart !== undefined || ctx.input.runScheduleEnd !== undefined) {
      patch.runSchedule = { start: ctx.input.runScheduleStart, end: ctx.input.runScheduleEnd };
    }

    await client.updateCampaign(ctx.input.campaignId, { patch }, ctx.input.accountId);

    return {
      output: { success: true },
      message: 'LinkedIn confirmed the requested operation.'
    };
  })
  .build();
