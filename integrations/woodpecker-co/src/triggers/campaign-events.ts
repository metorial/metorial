import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let CAMPAIGN_EVENTS = [
  'campaign_sent',
  'campaign_completed',
  'followup_after_autoreply',
  'email_opened',
  'link_clicked'
] as const;

let webhookInputSchema = z.object({
  eventType: z.string().describe('Webhook event type'),
  eventPayload: z.any().describe('Raw webhook event payload')
});

let campaignEventOutputSchema = z.object({
  prospectId: z.number().optional().describe('Prospect ID'),
  prospectEmail: z.string().optional().describe('Prospect email'),
  campaignId: z.number().optional().describe('Campaign ID'),
  campaignName: z.string().optional().describe('Campaign name'),
  step: z.number().optional().describe('Campaign step number'),
  emailSubject: z.string().optional().describe('Email subject (for sent events)'),
  emailFrom: z.string().optional().describe('Sender email (for sent events)'),
  clickUrl: z.string().optional().describe('Clicked link URL (for click events)'),
  openCount: z.number().optional().describe('Total open count (for open events)'),
  openDate: z.string().optional().describe('Latest open date (for open events)'),
  followupAfter: z
    .string()
    .optional()
    .describe('Scheduled follow-up date (for autoreply followup events)'),
  timestamp: z.string().optional().describe('Event timestamp')
});

export let campaignEvents = SlateTrigger.create(spec, {
  name: 'Campaign Events',
  key: 'campaign_events',
  description:
    'Triggered on campaign-level events: emails sent, campaigns completed, email opens, link clicks, and follow-ups after autoreplies.'
})
  .input(webhookInputSchema)
  .output(campaignEventOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        companyId: ctx.config.companyId
      });

      let registeredEvents: string[] = [];
      for (let event of CAMPAIGN_EVENTS) {
        try {
          await client.subscribeWebhook(ctx.input.webhookBaseUrl, event);
          registeredEvents.push(event);
        } catch (err: any) {
          if (err?.response?.status !== 409) {
            throw err;
          }
          registeredEvents.push(event);
        }
      }

      return {
        registrationDetails: { events: registeredEvents, targetUrl: ctx.input.webhookBaseUrl }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        companyId: ctx.config.companyId
      });

      let details = ctx.input.registrationDetails as { events: string[]; targetUrl: string };
      for (let event of details.events) {
        try {
          await client.unsubscribeWebhook(details.targetUrl, event);
        } catch {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = await ctx.request.json();
      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((event: any) => ({
          eventType: event.method ?? event.event ?? 'unknown',
          eventPayload: event
        }))
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let prospect = payload.prospect ?? {};
      let email = payload.email ?? {};
      let campaign = payload.campaign ?? {};

      let eventType = (ctx.input.eventType ?? 'unknown').toLowerCase();

      return {
        type: `campaign.${eventType}`,
        id: `${eventType}_${prospect.id ?? campaign.campaign_id ?? ''}_${payload.timestamp ?? Date.now()}`,
        output: {
          prospectId: prospect.id,
          prospectEmail: prospect.email,
          campaignId: prospect.campaign_id ?? campaign.campaign_id ?? email.campaign_id,
          campaignName: prospect.campaign_name ?? campaign.campaign_name,
          step: prospect.step ?? payload.step,
          emailSubject: email.subject,
          emailFrom: email.email_from,
          clickUrl: payload.click_url,
          openCount: payload.open_count,
          openDate: payload.open_date_latest,
          followupAfter: payload.followup_after,
          timestamp: payload.timestamp
        }
      };
    }
  })
  .build();
