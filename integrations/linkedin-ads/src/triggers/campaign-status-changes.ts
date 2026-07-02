import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let campaignStatusChanges = SlateTrigger.create(spec, {
  name: 'Campaign Status Changes',
  key: 'campaign_status_changes',
  description:
    'Triggers when campaigns in an ad account change status (e.g., become active, paused, or encounter serving issues). Polls periodically to detect changes.'
})
  .input(
    z.object({
      campaignId: z.number().describe('Numeric ID of the campaign'),
      campaignName: z.string().describe('Name of the campaign'),
      previousStatus: z.string().optional().describe('Previous status'),
      currentStatus: z.string().describe('Current status'),
      servingStatuses: z.array(z.string()).optional().describe('Current serving statuses'),
      account: z.string().describe('Account URN')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Numeric ID of the campaign'),
      campaignName: z.string().describe('Name of the campaign'),
      previousStatus: z.string().optional().describe('Previous campaign status'),
      currentStatus: z.string().describe('Current campaign status'),
      servingStatuses: z.array(z.string()).optional().describe('Current serving statuses'),
      account: z.string().describe('Account URN')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let state = ctx.state as {
        campaignStatuses?: Record<string, string>;
        accountId?: string;
      } | null;
      let previousStatuses = state?.campaignStatuses || {};
      let accountId = state?.accountId;

      if (!accountId) {
        // On first poll, return empty - the trigger needs state containing accountId
        return {
          inputs: [],
          updatedState: { campaignStatuses: {}, accountId: '' }
        };
      }

      let result = await client.getCampaigns(accountId, {
        pageSize: 100
      });

      let inputs: Array<{
        campaignId: number;
        campaignName: string;
        previousStatus: string | undefined;
        currentStatus: string;
        servingStatuses: string[] | undefined;
        account: string;
      }> = [];

      let newStatuses: Record<string, string> = {};

      for (let campaign of result.elements) {
        let key = String(campaign.id);
        newStatuses[key] = campaign.status;

        let prev = previousStatuses[key];
        if (prev && prev !== campaign.status) {
          inputs.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            previousStatus: prev,
            currentStatus: campaign.status,
            servingStatuses: campaign.servingStatuses,
            account: campaign.account
          });
        }
      }

      return {
        inputs,
        updatedState: {
          campaignStatuses: newStatuses,
          accountId
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
          servingStatuses: ctx.input.servingStatuses,
          account: ctx.input.account
        }
      };
    }
  })
  .build();
