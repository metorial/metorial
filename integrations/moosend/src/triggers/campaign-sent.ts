import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { spec } from '../spec';

export let campaignSent = SlateTrigger.create(spec, {
  name: 'Campaign Sent',
  key: 'campaign_sent',
  description:
    'Triggers when a campaign has been delivered (sent). Polls for campaigns with a delivered date newer than the last check.'
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      name: z.string().describe('Campaign name'),
      subject: z.string().describe('Campaign subject line'),
      deliveredOn: z.string().optional().describe('Delivery timestamp'),
      totalSent: z.number().optional().describe('Total emails sent'),
      recipientsCount: z.number().optional().describe('Number of recipients')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      name: z.string().describe('Campaign name'),
      subject: z.string().describe('Campaign subject line'),
      deliveredOn: z.string().optional().describe('Delivery timestamp'),
      totalSent: z.number().optional().describe('Total emails sent'),
      recipientsCount: z.number().optional().describe('Number of recipients')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MoosendClient({ token: ctx.auth.token });
      let state = ctx.state ?? {};
      let knownDeliveredIds = (state.knownDeliveredIds as string[]) ?? [];

      let result = await client.getCampaigns(1, 100);
      let campaigns = (result?.Campaigns as Record<string, unknown>[]) ?? [];

      let inputs: Array<{
        campaignId: string;
        name: string;
        subject: string;
        deliveredOn?: string;
        totalSent?: number;
        recipientsCount?: number;
      }> = [];

      let newKnownIds = [...knownDeliveredIds];

      for (let c of campaigns) {
        let deliveredOn = c?.DeliveredOn;
        let campaignId = String(c?.ID ?? '');

        if (deliveredOn && campaignId && !knownDeliveredIds.includes(campaignId)) {
          inputs.push({
            campaignId,
            name: String(c?.Name ?? ''),
            subject: String(c?.Subject ?? ''),
            deliveredOn: String(deliveredOn),
            totalSent: c?.TotalSent as number | undefined,
            recipientsCount: c?.RecipientsCount as number | undefined
          });
          newKnownIds.push(campaignId);
        }
      }

      // Keep only the last 500 known IDs to prevent unbounded growth
      if (newKnownIds.length > 500) {
        newKnownIds = newKnownIds.slice(-500);
      }

      return {
        inputs,
        updatedState: {
          knownDeliveredIds: newKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'campaign.sent',
        id: ctx.input.campaignId,
        output: {
          campaignId: ctx.input.campaignId,
          name: ctx.input.name,
          subject: ctx.input.subject,
          deliveredOn: ctx.input.deliveredOn,
          totalSent: ctx.input.totalSent,
          recipientsCount: ctx.input.recipientsCount
        }
      };
    }
  })
  .build();
