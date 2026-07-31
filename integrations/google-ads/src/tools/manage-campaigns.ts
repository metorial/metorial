import { badRequestError, ServiceError } from '@lowerdeck/error';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

let campaignStatusEnum = z.enum(['ENABLED', 'PAUSED', 'REMOVED']).describe('Campaign status');

let campaignTypeEnum = z
  .enum([
    'SEARCH',
    'DISPLAY',
    'SHOPPING',
    'VIDEO',
    'PERFORMANCE_MAX',
    'MULTI_CHANNEL',
    'LOCAL',
    'SMART',
    'HOTEL',
    'LOCAL_SERVICES',
    'DISCOVERY',
    'TRAVEL',
    'DEMAND_GEN'
  ])
  .describe('Campaign advertising channel type');

export let manageCampaigns = SlateTool.create(spec, {
  name: 'Manage Campaigns',
  key: 'manage_campaigns',
  description: `Create, update, or remove Google Ads campaigns. Supports setting campaign name, status, type, budget, start/end dates, bidding strategy, and network settings.

When creating a campaign, a campaign budget is automatically created if \`dailyBudgetMicros\` is provided. For updating, only the specified fields are modified.`,
  instructions: [
    'Monetary values use micros (1 currency unit = 1,000,000 micros). For example, $5.00 = 5000000 micros.',
    'When removing a campaign, only the campaignId is required.',
    'Campaign resource names follow the format: customers/{customerId}/campaigns/{campaignId}'
  ],
  constraints: ['Campaign type cannot be changed after creation.']
})
  .scopes(googleAdsActionScopes.manageCampaigns)
  .input(
    z.object({
      customerId: z.string().describe('The Google Ads customer account ID (without hyphens)'),
      operation: z.enum(['create', 'update', 'remove']).describe('The operation to perform'),
      campaignId: z.string().optional().describe('Campaign ID (required for update/remove)'),
      name: z.string().optional().describe('Campaign name (required for create)'),
      status: campaignStatusEnum.optional(),
      advertisingChannelType: campaignTypeEnum
        .optional()
        .describe('Campaign type (required for create)'),
      dailyBudgetMicros: z
        .string()
        .optional()
        .describe(
          'Daily budget in micros (e.g., "5000000" for $5.00). A budget resource is created automatically for new campaigns.'
        ),
      existingBudgetResourceName: z
        .string()
        .optional()
        .describe(
          'Resource name of an existing campaign budget to use instead of creating one'
        ),
      startDate: z
        .string()
        .optional()
        .describe(
          'Campaign start date in YYYY-MM-DD format. The campaign starts at 00:00:00 in the customer account timezone.'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'Campaign end date in YYYY-MM-DD format. The campaign ends at 23:59:59 in the customer account timezone.'
        ),
      containsEuPoliticalAdvertising: z
        .enum([
          'CONTAINS_EU_POLITICAL_ADVERTISING',
          'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING'
        ])
        .optional()
        .describe(
          'Required for create. Declare whether the campaign contains political advertising targeted toward the European Union.'
        ),
      biddingStrategyType: z
        .string()
        .optional()
        .describe(
          'Bidding strategy type, e.g., MANUAL_CPC, MAXIMIZE_CONVERSIONS, TARGET_CPA, TARGET_ROAS'
        ),
      targetCpaMicros: z
        .string()
        .optional()
        .describe('Target CPA in micros (for TARGET_CPA bidding)'),
      targetRoas: z
        .number()
        .optional()
        .describe('Target ROAS value (for TARGET_ROAS bidding, e.g., 3.5 for 350% ROAS)'),
      networkSettings: z
        .object({
          targetGoogleSearch: z.boolean().optional(),
          targetSearchNetwork: z.boolean().optional(),
          targetContentNetwork: z.boolean().optional(),
          targetPartnerSearchNetwork: z.boolean().optional()
        })
        .optional()
        .describe('Network targeting settings')
    })
  )
  .output(
    z.object({
      campaignResourceName: z
        .string()
        .optional()
        .describe('Resource name of the created/updated campaign'),
      budgetResourceName: z
        .string()
        .optional()
        .describe('Resource name of the created budget (if applicable)'),
      mutateResults: z.any().optional().describe('Raw API mutate response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { customerId, operation } = ctx.input;
    let cid = customerId.replace(/-/g, '');

    if (operation === 'remove') {
      if (!ctx.input.campaignId)
        throw new ServiceError(
          badRequestError({ message: 'campaignId is required for remove operation' })
        );
      let result = await client.mutateCampaigns(cid, [
        {
          remove: `customers/${cid}/campaigns/${ctx.input.campaignId}`
        }
      ]);
      return {
        output: {
          campaignResourceName: `customers/${cid}/campaigns/${ctx.input.campaignId}`,
          mutateResults: result
        },
        message: `Campaign **${ctx.input.campaignId}** has been removed.`
      };
    }

    if (operation === 'create') {
      if (!ctx.input.containsEuPoliticalAdvertising) {
        throw new ServiceError(
          badRequestError({
            message: 'containsEuPoliticalAdvertising is required for create operation.'
          })
        );
      }

      let budgetResourceName = ctx.input.existingBudgetResourceName;

      if (!budgetResourceName && ctx.input.dailyBudgetMicros) {
        let budgetResult = await client.mutateCampaignBudgets(cid, [
          {
            create: {
              amountMicros: ctx.input.dailyBudgetMicros,
              deliveryMethod: 'STANDARD',
              explicitlyShared: false
            }
          }
        ]);
        budgetResourceName = budgetResult.results?.[0]?.resourceName;
      }

      let campaignData: Record<string, any> = {
        name: ctx.input.name,
        advertisingChannelType: ctx.input.advertisingChannelType,
        containsEuPoliticalAdvertising: ctx.input.containsEuPoliticalAdvertising,
        status: ctx.input.status || 'PAUSED'
      };

      if (budgetResourceName) campaignData.campaignBudget = budgetResourceName;
      if (ctx.input.startDate) campaignData.startDateTime = `${ctx.input.startDate} 00:00:00`;
      if (ctx.input.endDate) campaignData.endDateTime = `${ctx.input.endDate} 23:59:59`;
      if (ctx.input.networkSettings) campaignData.networkSettings = ctx.input.networkSettings;

      if (ctx.input.biddingStrategyType) {
        switch (ctx.input.biddingStrategyType) {
          case 'MANUAL_CPC':
            campaignData.manualCpc = {};
            break;
          case 'MANUAL_CPM':
            campaignData.manualCpm = {};
            break;
          case 'MAXIMIZE_CONVERSIONS':
            campaignData.maximizeConversions = ctx.input.targetCpaMicros
              ? { targetCpaMicros: ctx.input.targetCpaMicros }
              : {};
            break;
          case 'MAXIMIZE_CONVERSION_VALUE':
            campaignData.maximizeConversionValue = ctx.input.targetRoas
              ? { targetRoas: ctx.input.targetRoas }
              : {};
            break;
          case 'TARGET_CPA':
            campaignData.targetCpa = { targetCpaMicros: ctx.input.targetCpaMicros };
            break;
          case 'TARGET_ROAS':
            campaignData.targetRoas = { targetRoas: ctx.input.targetRoas };
            break;
          case 'TARGET_SPEND':
            campaignData.targetSpend = {};
            break;
        }
      }

      let result = await client.mutateCampaigns(cid, [{ create: campaignData }]);
      let campaignResourceName = result.results?.[0]?.resourceName;

      return {
        output: {
          campaignResourceName,
          budgetResourceName,
          mutateResults: result
        },
        message: `Campaign **${ctx.input.name}** created successfully.`
      };
    }

    // Update
    if (!ctx.input.campaignId)
      throw new ServiceError(
        badRequestError({ message: 'campaignId is required for update operation' })
      );

    let resourceName = `customers/${cid}/campaigns/${ctx.input.campaignId}`;
    let updateData: Record<string, any> = { resourceName };
    let updateMaskFields: string[] = [];

    if (ctx.input.name !== undefined) {
      updateData.name = ctx.input.name;
      updateMaskFields.push('name');
    }
    if (ctx.input.status !== undefined) {
      updateData.status = ctx.input.status;
      updateMaskFields.push('status');
    }
    if (ctx.input.startDate !== undefined) {
      updateData.startDateTime = `${ctx.input.startDate} 00:00:00`;
      updateMaskFields.push('startDateTime');
    }
    if (ctx.input.endDate !== undefined) {
      updateData.endDateTime = `${ctx.input.endDate} 23:59:59`;
      updateMaskFields.push('endDateTime');
    }
    if (ctx.input.containsEuPoliticalAdvertising !== undefined) {
      updateData.containsEuPoliticalAdvertising = ctx.input.containsEuPoliticalAdvertising;
      updateMaskFields.push('containsEuPoliticalAdvertising');
    }
    if (ctx.input.networkSettings !== undefined) {
      updateData.networkSettings = ctx.input.networkSettings;
      updateMaskFields.push('networkSettings');
    }
    if (ctx.input.existingBudgetResourceName !== undefined) {
      updateData.campaignBudget = ctx.input.existingBudgetResourceName;
      updateMaskFields.push('campaignBudget');
    }

    if (ctx.input.biddingStrategyType) {
      switch (ctx.input.biddingStrategyType) {
        case 'MANUAL_CPC':
          updateData.manualCpc = {};
          updateMaskFields.push('manualCpc');
          break;
        case 'MAXIMIZE_CONVERSIONS':
          updateData.maximizeConversions = ctx.input.targetCpaMicros
            ? { targetCpaMicros: ctx.input.targetCpaMicros }
            : {};
          updateMaskFields.push('maximizeConversions');
          break;
        case 'MAXIMIZE_CONVERSION_VALUE':
          updateData.maximizeConversionValue = ctx.input.targetRoas
            ? { targetRoas: ctx.input.targetRoas }
            : {};
          updateMaskFields.push('maximizeConversionValue');
          break;
        case 'TARGET_CPA':
          updateData.targetCpa = { targetCpaMicros: ctx.input.targetCpaMicros };
          updateMaskFields.push('targetCpa');
          break;
        case 'TARGET_ROAS':
          updateData.targetRoas = { targetRoas: ctx.input.targetRoas };
          updateMaskFields.push('targetRoas');
          break;
        case 'TARGET_SPEND':
          updateData.targetSpend = {};
          updateMaskFields.push('targetSpend');
          break;
      }
    }

    let result = await client.mutateCampaigns(cid, [
      {
        update: updateData,
        updateMask: updateMaskFields.join(',')
      }
    ]);

    return {
      output: {
        campaignResourceName: resourceName,
        mutateResults: result
      },
      message: `Campaign **${ctx.input.campaignId}** updated (fields: ${updateMaskFields.join(', ')}).`
    };
  })
  .build();
