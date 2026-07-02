import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let campaignEvents = SlateTrigger.create(spec, {
  name: 'Campaign & Email Events',
  key: 'campaign_email_events',
  description:
    'Triggers on campaign and email activity events including email sent, opened, clicked, replied, bounced, auto-reply received, campaign completed, and account errors.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the event'),
      timestamp: z.string().optional().describe('Event timestamp'),
      payload: z.any().describe('Raw event payload from Instantly')
    })
  )
  .output(
    z.object({
      campaignId: z.string().optional().describe('Associated campaign ID'),
      campaignName: z.string().optional().describe('Campaign name'),
      leadEmail: z.string().optional().describe('Lead email address'),
      fromAccount: z.string().optional().describe('Sending account email'),
      subject: z.string().optional().describe('Email subject'),
      body: z.string().optional().describe('Email body'),
      step: z.number().optional().describe('Campaign step number'),
      emailId: z.string().optional().describe('Email ID'),
      threadId: z.string().optional().describe('Thread ID'),
      rawPayload: z.any().optional().describe('Full event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        targetHookUrl: ctx.input.webhookBaseUrl,
        eventType: 'all_events',
        name: 'Slates Campaign & Email Events'
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event_type ?? data.eventType ?? 'unknown';

      let emailEventTypes = [
        'email_sent',
        'email_opened',
        'email_link_clicked',
        'reply_received',
        'auto_reply_received',
        'email_bounced',
        'campaign_completed',
        'account_error'
      ];

      if (!emailEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      let _eventId =
        data.id ??
        data.event_id ??
        `${eventType}_${data.lead_email ?? ''}_${data.timestamp ?? Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            timestamp: data.timestamp,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { payload } = ctx.input;

      return {
        type: ctx.input.eventType.replace(/-/g, '_'),
        id:
          payload.id ??
          payload.event_id ??
          `${ctx.input.eventType}_${payload.lead_email ?? ''}_${payload.timestamp ?? Date.now()}`,
        output: {
          campaignId: payload.campaign_id ?? payload.campaign,
          campaignName: payload.campaign_name,
          leadEmail: payload.lead_email ?? payload.email ?? payload.to_address_email,
          fromAccount: payload.from_address_email ?? payload.eaccount,
          subject: payload.subject,
          body: payload.body ?? payload.text,
          step: payload.step,
          emailId: payload.email_id ?? payload.id,
          threadId: payload.thread_id,
          rawPayload: payload
        }
      };
    }
  })
  .build();
