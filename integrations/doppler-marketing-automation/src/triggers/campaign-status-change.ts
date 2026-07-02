import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let campaignStatusChange = SlateTrigger.create(spec, {
  name: 'Campaign Status Change',
  key: 'campaign_status_change',
  description:
    'Triggers when a campaign changes status (e.g. from draft to scheduled, or shipping to shipped). Polls campaigns for status updates.'
})
  .input(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      name: z.string().describe('Campaign name'),
      subject: z.string().describe('Campaign subject'),
      fromName: z.string().describe('Sender name'),
      fromEmail: z.string().describe('Sender email'),
      previousStatus: z.string().describe('Previous campaign status'),
      currentStatus: z.string().describe('Current campaign status')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      name: z.string().describe('Campaign name'),
      subject: z.string().describe('Campaign subject'),
      fromName: z.string().describe('Sender name'),
      fromEmail: z.string().describe('Sender email'),
      previousStatus: z.string().describe('Previous campaign status'),
      currentStatus: z.string().describe('Current campaign status')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountEmail: ctx.config.accountEmail
      });

      let state = ctx.state as { campaignStatuses?: Record<string, string> } | null;
      let previousStatuses: Record<string, string> = state?.campaignStatuses ?? {};

      let result = await client.getCampaigns(1, 20);
      let campaigns = result.items ?? [];

      let inputs: Array<{
        campaignId: number;
        name: string;
        subject: string;
        fromName: string;
        fromEmail: string;
        previousStatus: string;
        currentStatus: string;
      }> = [];

      let updatedStatuses: Record<string, string> = {};

      for (let campaign of campaigns) {
        let key = String(campaign.campaignId);
        updatedStatuses[key] = campaign.status;

        let prevStatus = previousStatuses[key];
        if (prevStatus && prevStatus !== campaign.status) {
          inputs.push({
            campaignId: campaign.campaignId,
            name: campaign.name,
            subject: campaign.subject,
            fromName: campaign.fromName,
            fromEmail: campaign.fromEmail,
            previousStatus: prevStatus,
            currentStatus: campaign.status
          });
        }
      }

      return {
        inputs,
        updatedState: {
          campaignStatuses: updatedStatuses
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: `campaign.${ctx.input.currentStatus}`,
        id: `${ctx.input.campaignId}-${ctx.input.previousStatus}-${ctx.input.currentStatus}`,
        output: {
          campaignId: ctx.input.campaignId,
          name: ctx.input.name,
          subject: ctx.input.subject,
          fromName: ctx.input.fromName,
          fromEmail: ctx.input.fromEmail,
          previousStatus: ctx.input.previousStatus,
          currentStatus: ctx.input.currentStatus
        }
      };
    }
  })
  .build();
