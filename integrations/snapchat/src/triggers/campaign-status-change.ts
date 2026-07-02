import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { spec } from '../spec';

export let campaignStatusChange = SlateTrigger.create(spec, {
  name: 'Campaign Updates',
  key: 'campaign_updates',
  description:
    'Triggers when campaigns are created or updated in a Snapchat ad account. Detects changes to campaign status, budgets, schedules, and other properties by polling the campaigns endpoint.',
  instructions: [
    'Set the adAccountId in the global configuration to specify which ad account to monitor.'
  ]
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the campaign was created or updated'),
      campaignId: z.string().describe('ID of the campaign'),
      name: z.string().optional().describe('Campaign name'),
      status: z.string().optional().describe('Campaign status'),
      objective: z.string().optional().describe('Campaign objective'),
      dailyBudgetMicro: z.number().optional().describe('Daily budget in micro-currency'),
      lifetimeSpendCapMicro: z
        .number()
        .optional()
        .describe('Lifetime spend cap in micro-currency'),
      startTime: z.string().optional().describe('Campaign start time'),
      endTime: z.string().optional().describe('Campaign end time'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      name: z.string().optional().describe('Campaign name'),
      status: z.string().optional().describe('Campaign status'),
      objective: z.string().optional().describe('Campaign objective'),
      dailyBudgetMicro: z.number().optional().describe('Daily budget in micro-currency'),
      lifetimeSpendCapMicro: z
        .number()
        .optional()
        .describe('Lifetime spend cap in micro-currency'),
      startTime: z.string().optional().describe('Campaign start time'),
      endTime: z.string().optional().describe('Campaign end time'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let adAccountId = ctx.config.adAccountId;
      if (!adAccountId) {
        return { inputs: [] };
      }

      let client = new SnapchatClient(ctx.auth.token);
      let campaigns = (await client.listCampaigns(adAccountId)).items;

      let previousState: Record<string, string> =
        (ctx.input.state as Record<string, string>) ?? {};
      let inputs: any[] = [];

      for (let campaign of campaigns) {
        let prevUpdatedAt = previousState[campaign.id];
        let currentUpdatedAt = campaign.updated_at;

        if (!prevUpdatedAt) {
          inputs.push({
            eventType: 'created' as const,
            campaignId: campaign.id,
            name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
            dailyBudgetMicro: campaign.daily_budget_micro,
            lifetimeSpendCapMicro: campaign.lifetime_spend_cap_micro,
            startTime: campaign.start_time,
            endTime: campaign.end_time,
            updatedAt: campaign.updated_at,
            createdAt: campaign.created_at
          });
        } else if (currentUpdatedAt && currentUpdatedAt !== prevUpdatedAt) {
          inputs.push({
            eventType: 'updated' as const,
            campaignId: campaign.id,
            name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
            dailyBudgetMicro: campaign.daily_budget_micro,
            lifetimeSpendCapMicro: campaign.lifetime_spend_cap_micro,
            startTime: campaign.start_time,
            endTime: campaign.end_time,
            updatedAt: campaign.updated_at,
            createdAt: campaign.created_at
          });
        }
      }

      let updatedState: Record<string, string> = {};
      for (let campaign of campaigns) {
        if (campaign.updated_at) {
          updatedState[campaign.id] = campaign.updated_at;
        }
      }

      return {
        inputs,
        updatedState
      };
    },

    handleEvent: async ctx => {
      return {
        type: `campaign.${ctx.input.eventType}`,
        id: `${ctx.input.campaignId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          campaignId: ctx.input.campaignId,
          name: ctx.input.name,
          status: ctx.input.status,
          objective: ctx.input.objective,
          dailyBudgetMicro: ctx.input.dailyBudgetMicro,
          lifetimeSpendCapMicro: ctx.input.lifetimeSpendCapMicro,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          updatedAt: ctx.input.updatedAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
