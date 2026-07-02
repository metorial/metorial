import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newCampaign = SlateTrigger.create(spec, {
  name: 'New Campaign',
  key: 'new_campaign',
  description: 'Triggers when a new email campaign is created in SendFox.'
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign'),
      title: z.string().describe('Campaign title'),
      subject: z.string().describe('Email subject line'),
      fromName: z.string().describe('Sender name'),
      fromEmail: z.string().describe('Sender email'),
      scheduledAt: z.string().nullable().describe('Scheduled send time'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      title: z.string().describe('Campaign title'),
      subject: z.string().describe('Email subject line'),
      fromName: z.string().describe('Sender name'),
      fromEmail: z.string().describe('Sender email'),
      scheduledAt: z.string().nullable().describe('Scheduled send time'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastSeenId: number | null = ctx.state?.lastSeenId ?? null;
      let inputs: Array<{
        campaignId: number;
        title: string;
        subject: string;
        fromName: string;
        fromEmail: string;
        scheduledAt: string | null;
        createdAt: string;
      }> = [];

      let page = 1;
      let foundExisting = false;
      let newLastSeenId = lastSeenId;

      while (!foundExisting) {
        let result = await client.listCampaigns(page);

        if (result.data.length === 0) break;

        for (let campaign of result.data) {
          if (lastSeenId !== null && campaign.id <= lastSeenId) {
            foundExisting = true;
            break;
          }

          if (newLastSeenId === null || campaign.id > newLastSeenId) {
            newLastSeenId = campaign.id;
          }

          inputs.push({
            campaignId: campaign.id,
            title: campaign.title,
            subject: campaign.subject,
            fromName: campaign.from_name,
            fromEmail: campaign.from_email,
            scheduledAt: campaign.scheduled_at,
            createdAt: campaign.created_at
          });
        }

        if (!foundExisting && result.current_page < result.last_page) {
          page++;
        } else {
          break;
        }
      }

      // On first poll, just establish the baseline
      if (lastSeenId === null) {
        return {
          inputs: [],
          updatedState: { lastSeenId: newLastSeenId }
        };
      }

      return {
        inputs,
        updatedState: { lastSeenId: newLastSeenId ?? lastSeenId }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'campaign.created',
        id: String(ctx.input.campaignId),
        output: {
          campaignId: ctx.input.campaignId,
          title: ctx.input.title,
          subject: ctx.input.subject,
          fromName: ctx.input.fromName,
          fromEmail: ctx.input.fromEmail,
          scheduledAt: ctx.input.scheduledAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
