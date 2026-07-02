import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let campaignActivity = SlateTrigger.create(spec, {
  name: 'Campaign Activity',
  key: 'campaign_activity',
  description:
    'Detects new or recently edited campaigns in your Braze workspace by polling the campaigns list endpoint.'
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      name: z.string().describe('Campaign name'),
      isApiCampaign: z.boolean().optional().describe('Whether this is an API campaign'),
      tags: z.array(z.string()).optional().describe('Campaign tags'),
      lastEdited: z.string().optional().describe('Last edited timestamp')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      name: z.string().describe('Campaign name'),
      isApiCampaign: z.boolean().optional().describe('Whether this is an API campaign'),
      tags: z.array(z.string()).optional().describe('Campaign tags'),
      lastEdited: z.string().optional().describe('Last edited timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BrazeClient({
        token: ctx.auth.token,
        instanceUrl: ctx.config.instanceUrl
      });

      let lastPolled = ctx.state?.lastPolled as string | undefined;
      let knownCampaignIds = (ctx.state?.knownCampaignIds as string[] | undefined) ?? [];

      let params: {
        page?: number;
        includeArchived?: boolean;
        sortDirection?: string;
        lastEditTimeGt?: string;
      } = {
        sortDirection: 'desc'
      };

      if (lastPolled) {
        params.lastEditTimeGt = lastPolled;
      }

      let result = await client.listCampaigns(params);
      let campaigns = result.campaigns ?? [];

      let newCampaigns = lastPolled
        ? campaigns
        : campaigns.filter((c: any) => !knownCampaignIds.includes(c.id));

      let updatedKnownIds = [
        ...new Set([...knownCampaignIds, ...campaigns.map((c: any) => c.id)])
      ];

      let now = new Date().toISOString();

      return {
        inputs: newCampaigns.map((c: any) => ({
          campaignId: c.id,
          name: c.name,
          isApiCampaign: c.is_api_campaign,
          tags: c.tags,
          lastEdited: c.last_edited
        })),
        updatedState: {
          lastPolled: now,
          knownCampaignIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'campaign.updated',
        id: `campaign-${ctx.input.campaignId}-${ctx.input.lastEdited ?? Date.now()}`,
        output: {
          campaignId: ctx.input.campaignId,
          name: ctx.input.name,
          isApiCampaign: ctx.input.isApiCampaign,
          tags: ctx.input.tags,
          lastEdited: ctx.input.lastEdited
        }
      };
    }
  })
  .build();
