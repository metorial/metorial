import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokBusinessClient } from '../lib/client';
import { spec } from '../spec';

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create, update, or change the status of TikTok Ads campaigns. Supports creating a new campaign with objective type and budget settings, updating an existing campaign's name or budget, and enabling/disabling campaigns.

Use the **action** field to specify the operation:
- **create**: Create a new campaign
- **update**: Update campaign name, budget, or budget mode
- **updateStatus**: Enable, disable, or delete campaigns`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'updateStatus'])
        .describe('The operation to perform.'),
      advertiserId: z.string().describe('TikTok Ads advertiser/account ID.'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for update and updateStatus).'),
      campaignIds: z
        .array(z.string())
        .optional()
        .describe('Campaign IDs for batch status update.'),
      campaignName: z.string().optional().describe('Campaign name (required for create).'),
      objectiveType: z
        .string()
        .optional()
        .describe(
          'Advertising objective (e.g. TRAFFIC, CONVERSIONS, APP_PROMOTION, REACH). Required for create.'
        ),
      budgetMode: z
        .string()
        .optional()
        .describe('Budget mode: BUDGET_MODE_DAY, BUDGET_MODE_TOTAL, or BUDGET_MODE_INFINITE.'),
      budget: z.number().optional().describe('Campaign budget amount.'),
      operationStatus: z
        .string()
        .optional()
        .describe('Status to set: ENABLE, DISABLE, or DELETE (for updateStatus action).'),
      campaignType: z
        .string()
        .optional()
        .describe('Campaign type: REGULAR_CAMPAIGN or IOS14_CAMPAIGN.'),
      budgetOptimizeOn: z.boolean().optional().describe('Enable Campaign Budget Optimization.')
    })
  )
  .output(
    z.object({
      campaignId: z.string().optional().describe('ID of the created or updated campaign.'),
      campaignIds: z
        .array(z.string())
        .optional()
        .describe('IDs of campaigns with updated status.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TikTokBusinessClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let result = await client.createCampaign({
        advertiserId: ctx.input.advertiserId,
        campaignName: ctx.input.campaignName ?? '',
        objectiveType: ctx.input.objectiveType ?? '',
        budgetMode: ctx.input.budgetMode,
        budget: ctx.input.budget,
        operationStatus: ctx.input.operationStatus,
        campaignType: ctx.input.campaignType,
        budgetOptimizeOn: ctx.input.budgetOptimizeOn
      });
      return {
        output: { campaignId: result.campaignId },
        message: `Campaign **${ctx.input.campaignName}** created with ID \`${result.campaignId}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateCampaign({
        advertiserId: ctx.input.advertiserId,
        campaignId: ctx.input.campaignId ?? '',
        campaignName: ctx.input.campaignName,
        budget: ctx.input.budget,
        budgetMode: ctx.input.budgetMode,
        operationStatus: ctx.input.operationStatus
      });
      return {
        output: { campaignId: result.campaignId },
        message: `Campaign \`${result.campaignId}\` updated.`
      };
    }

    // updateStatus
    let ids = ctx.input.campaignIds ?? (ctx.input.campaignId ? [ctx.input.campaignId] : []);
    let result = await client.updateCampaignStatus({
      advertiserId: ctx.input.advertiserId,
      campaignIds: ids,
      operationStatus: ctx.input.operationStatus ?? 'ENABLE'
    });
    return {
      output: { campaignIds: result.campaignIds },
      message: `Updated status of ${result.campaignIds.length} campaign(s) to **${ctx.input.operationStatus}**.`
    };
  })
  .build();
