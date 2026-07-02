import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let campaignStatusChange = SlateTrigger.create(spec, {
  name: 'Campaign Status Change',
  key: 'campaign_status_change',
  description:
    'Detects when campaign statuses change (e.g., activated, paused, completed). Polls the Reddit Ads API to compare current campaign statuses against previously observed states.'
})
  .input(
    z.object({
      campaignId: z.string(),
      campaignName: z.string(),
      previousStatus: z.string().optional(),
      currentStatus: z.string(),
      objective: z.string().optional(),
      raw: z.any().optional()
    })
  )
  .output(
    z.object({
      campaignId: z.string(),
      campaignName: z.string(),
      previousStatus: z.string().optional(),
      currentStatus: z.string(),
      objective: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new RedditAdsClient({
        token: ctx.auth.token,
        accountId: ctx.config.accountId
      });

      let campaigns = await client.listCampaigns();
      let previousStatuses: Record<string, string> = ctx.state?.campaignStatuses || {};
      let inputs: Array<{
        campaignId: string;
        campaignName: string;
        previousStatus: string | undefined;
        currentStatus: string;
        objective: string | undefined;
        raw: any;
      }> = [];

      let currentStatuses: Record<string, string> = {};

      for (let campaign of Array.isArray(campaigns) ? campaigns : []) {
        let id = campaign.id || campaign.campaign_id;
        let status = campaign.status || campaign.effective_status;
        if (!id || !status) continue;

        currentStatuses[id] = status;

        let prevStatus = previousStatuses[id];
        if (prevStatus !== undefined && prevStatus !== status) {
          inputs.push({
            campaignId: id,
            campaignName: campaign.name || '',
            previousStatus: prevStatus,
            currentStatus: status,
            objective: campaign.objective,
            raw: campaign
          });
        }
      }

      return {
        inputs,
        updatedState: {
          campaignStatuses: currentStatuses
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'campaign.status_changed',
        id: `${ctx.input.campaignId}-${ctx.input.currentStatus}-${Date.now()}`,
        output: {
          campaignId: ctx.input.campaignId,
          campaignName: ctx.input.campaignName,
          previousStatus: ctx.input.previousStatus,
          currentStatus: ctx.input.currentStatus,
          objective: ctx.input.objective
        }
      };
    }
  })
  .build();
