import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { snapchatServiceError } from '../lib/errors';
import { spec } from '../spec';

let campaignOutputSchema = z.object({
  campaignId: z.string().describe('Unique ID of the campaign'),
  adAccountId: z.string().optional().describe('Parent ad account ID'),
  name: z.string().optional().describe('Campaign name'),
  status: z.string().optional().describe('Campaign status (ACTIVE, PAUSED, etc.)'),
  objective: z.string().optional().describe('Campaign objective'),
  startTime: z.string().optional().describe('Campaign start time'),
  endTime: z.string().optional().describe('Campaign end time'),
  dailyBudgetMicro: z.number().optional().describe('Daily budget in micro-currency'),
  lifetimeSpendCapMicro: z
    .number()
    .optional()
    .describe('Lifetime spend cap in micro-currency'),
  objectiveV2Properties: z
    .any()
    .optional()
    .describe('Current objective_v2_properties payload'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create or update a Snapchat advertising campaign. To create a new campaign, provide an **adAccountId** and campaign properties. To update, also provide a **campaignId**. Supports setting name, status, objective, budget, and schedule.`,
  instructions: [
    'Budget values are in micro-currency (1 USD = 1,000,000 micro-currency).',
    'Valid statuses: ACTIVE, PAUSED.',
    'To create, adAccountId is required. To update, both adAccountId and campaignId are required.'
  ]
})
  .input(
    z.object({
      adAccountId: z.string().describe('Ad account ID the campaign belongs to'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID to update (omit to create a new campaign)'),
      name: z.string().optional().describe('Campaign name'),
      status: z.enum(['ACTIVE', 'PAUSED']).optional().describe('Campaign status'),
      objective: z
        .string()
        .optional()
        .describe(
          'Campaign objective (e.g., APP_INSTALLS, WEB_CONVERSIONS, VIDEO_VIEWS, BRAND_AWARENESS, LEAD_GENERATION)'
        ),
      objectiveV2Properties: z
        .any()
        .optional()
        .describe(
          'Objective v2 properties object, e.g. { objective_v2_type: "SALES" }. Recommended for new campaigns.'
        ),
      startTime: z.string().optional().describe('Campaign start time in ISO 8601 format'),
      endTime: z.string().optional().describe('Campaign end time in ISO 8601 format'),
      dailyBudgetMicro: z.number().optional().describe('Daily budget in micro-currency'),
      lifetimeSpendCapMicro: z
        .number()
        .optional()
        .describe('Lifetime spend cap in micro-currency')
    })
  )
  .output(campaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let { adAccountId, campaignId, ...fields } = ctx.input;

    if (!campaignId) {
      if (!fields.name) throw snapchatServiceError('name is required to create a campaign.');
      if (!fields.status)
        throw snapchatServiceError('status is required to create a campaign.');
      if (!fields.startTime) {
        throw snapchatServiceError('startTime is required to create a campaign.');
      }
    }

    let campaignData: Record<string, any> = {};
    if (campaignId) campaignData.id = campaignId;
    if (fields.name) campaignData.name = fields.name;
    if (fields.status) campaignData.status = fields.status;
    if (fields.objective) campaignData.objective = fields.objective;
    if (fields.objectiveV2Properties)
      campaignData.objective_v2_properties = fields.objectiveV2Properties;
    if (fields.startTime) campaignData.start_time = fields.startTime;
    if (fields.endTime) campaignData.end_time = fields.endTime;
    if (fields.dailyBudgetMicro !== undefined)
      campaignData.daily_budget_micro = fields.dailyBudgetMicro;
    if (fields.lifetimeSpendCapMicro !== undefined)
      campaignData.lifetime_spend_cap_micro = fields.lifetimeSpendCapMicro;

    let result: any;
    if (campaignId) {
      result = await client.updateCampaign(adAccountId, campaignData);
    } else {
      result = await client.createCampaign(adAccountId, campaignData);
    }

    if (!result) {
      throw snapchatServiceError('Snapchat did not return a campaign in the API response.');
    }

    let output = {
      campaignId: result.id,
      adAccountId: result.ad_account_id,
      name: result.name,
      status: result.status,
      objective: result.objective,
      startTime: result.start_time,
      endTime: result.end_time,
      dailyBudgetMicro: result.daily_budget_micro,
      lifetimeSpendCapMicro: result.lifetime_spend_cap_micro,
      objectiveV2Properties: result.objective_v2_properties,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    let action = campaignId ? 'Updated' : 'Created';
    return {
      output,
      message: `${action} campaign **${output.name}** (${output.campaignId}).`
    };
  })
  .build();
