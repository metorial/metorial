import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let campaignCompleted = SlateTrigger.create(spec, {
  name: 'Campaign Completed',
  key: 'campaign_completed',
  description: 'Triggers when a campaign finishes processing and its results become available.'
})
  .input(
    z.object({
      campaignId: z.string().describe('The campaign ID that completed processing'),
      campaignName: z.string().describe('Name of the completed campaign'),
      status: z.string().describe('Campaign status'),
      dateAdded: z.string().describe('When the campaign was submitted')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Unique identifier of the completed campaign'),
      campaignName: z.string().describe('Name of the campaign'),
      dateAdded: z.string().describe('Timestamp when the campaign was submitted')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let campaigns = await client.getCampaignList();

      let previousCompletedIds: string[] = ctx.state?.completedIds ?? [];

      let completedCampaigns = campaigns.filter(c => c.status === 'completed');
      let newlyCompleted = completedCampaigns.filter(
        c => !previousCompletedIds.includes(c.id)
      );

      let allCompletedIds = completedCampaigns.map(c => c.id);

      return {
        inputs: newlyCompleted.map(c => ({
          campaignId: c.id,
          campaignName: c.campaignName,
          status: c.status,
          dateAdded: c.dateAdded
        })),
        updatedState: {
          completedIds: allCompletedIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'campaign.completed',
        id: ctx.input.campaignId,
        output: {
          campaignId: ctx.input.campaignId,
          campaignName: ctx.input.campaignName,
          dateAdded: ctx.input.dateAdded
        }
      };
    }
  })
  .build();
