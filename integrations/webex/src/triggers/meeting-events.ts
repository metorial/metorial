import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let meetingEvents = SlateTrigger.create(spec, {
  name: 'Meeting Events',
  key: 'meeting_events',
  description:
    'Triggers when meetings are created, updated, deleted, started, or ended in Webex.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated', 'deleted', 'started', 'ended'])
        .describe('Type of meeting event'),
      webhookPayload: z.any().describe('Raw webhook notification payload from Webex')
    })
  )
  .output(
    z.object({
      meetingId: z.string().describe('ID of the meeting'),
      meetingNumber: z.string().optional().describe('Meeting number'),
      title: z.string().optional().describe('Meeting title'),
      start: z.string().optional().describe('Scheduled start time'),
      end: z.string().optional().describe('Scheduled end time'),
      hostEmail: z.string().optional().describe('Host email'),
      hostDisplayName: z.string().optional().describe('Host display name'),
      webLink: z.string().optional().describe('Meeting join URL'),
      state: z.string().optional().describe('Meeting state'),
      meetingType: z.string().optional().describe('Type of meeting')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WebexClient({ token: ctx.auth.token });

      let events = ['created', 'updated', 'deleted', 'started', 'ended'];
      let webhookIds: string[] = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          name: `Slates Meeting ${event}`,
          targetUrl: ctx.input.webhookBaseUrl,
          resource: 'meetings',
          event
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WebexClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            webhookPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;
      let resourceData = payload.data || {};

      return {
        type: `meeting.${ctx.input.eventType}`,
        id: payload.id || resourceData.id || `meeting-${Date.now()}`,
        output: {
          meetingId: resourceData.id || payload.id,
          meetingNumber: resourceData.meetingNumber,
          title: resourceData.title,
          start: resourceData.start,
          end: resourceData.end,
          hostEmail: resourceData.hostEmail,
          hostDisplayName: resourceData.hostDisplayName,
          webLink: resourceData.webLink,
          state: resourceData.state,
          meetingType: resourceData.meetingType
        }
      };
    }
  })
  .build();
