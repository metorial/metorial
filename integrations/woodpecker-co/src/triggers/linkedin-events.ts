import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let LINKEDIN_EVENTS = ['prospect_li_cr_accepted'] as const;

let webhookInputSchema = z.object({
  eventType: z.string().describe('Webhook event type'),
  eventPayload: z.any().describe('Raw webhook event payload')
});

let linkedinEventOutputSchema = z.object({
  prospectId: z.number().optional().describe('Prospect ID'),
  prospectEmail: z.string().optional().describe('Prospect email'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  company: z.string().optional().describe('Company name'),
  linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
  campaignId: z.number().optional().describe('Campaign ID'),
  campaignName: z.string().optional().describe('Campaign name'),
  timestamp: z.string().optional().describe('Event timestamp')
});

export let linkedinEvents = SlateTrigger.create(spec, {
  name: 'LinkedIn Events',
  key: 'linkedin_events',
  description:
    'Triggered when a LinkedIn-related event occurs, such as a connection request being accepted by a prospect.'
})
  .input(webhookInputSchema)
  .output(linkedinEventOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        companyId: ctx.config.companyId
      });

      let registeredEvents: string[] = [];
      for (let event of LINKEDIN_EVENTS) {
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

      let eventType = (ctx.input.eventType ?? 'unknown').toLowerCase();

      return {
        type: `linkedin.${eventType}`,
        id: `${eventType}_${prospect.id ?? ''}_${payload.timestamp ?? Date.now()}`,
        output: {
          prospectId: prospect.id,
          prospectEmail: prospect.email,
          firstName: prospect.first_name,
          lastName: prospect.last_name,
          company: prospect.company,
          linkedinUrl: prospect.linkedin_url,
          campaignId: prospect.campaign_id,
          campaignName: prospect.campaign_name,
          timestamp: payload.timestamp
        }
      };
    }
  })
  .build();
