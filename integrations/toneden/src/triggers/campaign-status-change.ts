import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

export let campaignStatusChange = SlateTrigger.create(spec, {
  name: 'Campaign Status Change',
  key: 'campaign_status_change',
  description:
    'Triggers when an ad campaign changes status (e.g., becomes active, paused, error, or inactive). Polls all campaigns and detects status changes between runs.'
})
  .input(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      title: z.string().describe('Campaign title'),
      platform: z.string().describe('Ad platform'),
      previousStatus: z.string().describe('Previous campaign status'),
      currentStatus: z.string().describe('Current campaign status')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      title: z.string().describe('Campaign title'),
      platform: z.string().describe('Ad platform (facebook or google)'),
      previousStatus: z.string().describe('Status before the change'),
      currentStatus: z.string().describe('New campaign status'),
      budgetType: z.string().optional().describe('Budget type'),
      budgetAmount: z.number().optional().describe('Budget amount')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ToneDenClient({ token: ctx.auth.token });

      let previousStatuses: Record<string, string> = ctx.state?.campaignStatuses || {};
      let inputs: any[] = [];
      let newStatuses: Record<string, string> = {};

      let statuses = ['active', 'live', 'paused', 'error', 'inactive', 'scheduled', 'recent'];
      for (let status of statuses) {
        try {
          let campaigns = await client.listCampaigns('me', { status });
          for (let campaign of campaigns || []) {
            let key = String(campaign.id);
            newStatuses[key] = campaign.status;

            let prev = previousStatuses[key];
            if (prev && prev !== campaign.status) {
              inputs.push({
                campaignId: campaign.id,
                title: campaign.title,
                platform: campaign.platform,
                previousStatus: prev,
                currentStatus: campaign.status
              });
            }
          }
        } catch {
          // Skip status types that may not be available
        }
      }

      return {
        inputs,
        updatedState: {
          campaignStatuses: { ...previousStatuses, ...newStatuses }
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'campaign.status_changed',
        id: `campaign-${ctx.input.campaignId}-${ctx.input.currentStatus}-${Date.now()}`,
        output: {
          campaignId: ctx.input.campaignId,
          title: ctx.input.title,
          platform: ctx.input.platform,
          previousStatus: ctx.input.previousStatus,
          currentStatus: ctx.input.currentStatus
        }
      };
    }
  })
  .build();
