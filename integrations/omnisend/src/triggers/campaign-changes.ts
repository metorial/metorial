import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

export let campaignChanges = SlateTrigger.create(spec, {
  name: 'Campaign Changes',
  key: 'campaign_changes',
  description:
    'Triggers when campaigns are created or updated in Omnisend. Polls for recently modified campaigns across email, SMS, and push channels.'
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      name: z.string().optional().describe('Campaign name'),
      channel: z.string().optional().describe('Channel (email, sms, push)'),
      type: z.string().optional().describe('Campaign type'),
      status: z.string().optional().describe('Campaign status'),
      subjectLine: z.string().optional().describe('Email subject line'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      name: z.string().optional().describe('Campaign name'),
      channel: z.string().optional().describe('Channel (email, sms, push)'),
      type: z.string().optional().describe('Campaign type'),
      status: z.string().optional().describe('Campaign status'),
      subjectLine: z.string().optional().describe('Email subject line'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new OmnisendClient(ctx.auth.token);
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let result = await client.listCampaigns({
        updatedAtFrom: lastPollTime
      });

      let campaigns = result.campaigns || [];
      let newLastPollTime = lastPollTime;
      let seenIds = (ctx.state?.seenIds || {}) as Record<string, boolean>;

      let inputs: Array<{
        campaignId: string;
        name?: string;
        channel?: string;
        type?: string;
        status?: string;
        subjectLine?: string;
        createdAt?: string;
        updatedAt?: string;
      }> = [];

      for (let campaign of campaigns) {
        let updatedAt = campaign.updatedAt || '';

        inputs.push({
          campaignId: campaign.id,
          name: campaign.name,
          channel: campaign.channel,
          type: campaign.type,
          status: campaign.status,
          subjectLine: campaign.subjectLine,
          createdAt: campaign.createdAt,
          updatedAt
        });

        seenIds[campaign.id] = true;

        if (!newLastPollTime || updatedAt > newLastPollTime) {
          newLastPollTime = updatedAt;
        }
      }

      if (!lastPollTime && inputs.length === 0) {
        newLastPollTime = new Date().toISOString();
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: newLastPollTime || new Date().toISOString(),
          seenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `campaign.updated`,
        id: `campaign-${ctx.input.campaignId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          campaignId: ctx.input.campaignId,
          name: ctx.input.name,
          channel: ctx.input.channel,
          type: ctx.input.type,
          status: ctx.input.status,
          subjectLine: ctx.input.subjectLine,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
