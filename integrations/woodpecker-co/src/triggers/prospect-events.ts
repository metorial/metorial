import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let PROSPECT_EVENTS = [
  'prospect_replied',
  'prospect_bounced',
  'prospect_invalid',
  'prospect_autoreplied',
  'prospect_blacklisted',
  'prospect_opt_out',
  'prospect_non_responsive',
  'prospect_saved',
  'prospect_interested',
  'prospect_maybe_later',
  'prospect_not_interested',
  'secondary_replied'
] as const;

let webhookInputSchema = z.object({
  eventType: z.string().describe('Webhook event type'),
  eventPayload: z.any().describe('Raw webhook event payload')
});

let prospectOutputSchema = z.object({
  prospectId: z.number().optional().describe('Prospect ID'),
  email: z.string().optional().describe('Prospect email'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  company: z.string().optional().describe('Company name'),
  website: z.string().optional().describe('Website'),
  title: z.string().optional().describe('Job title'),
  phone: z.string().optional().describe('Phone number'),
  tags: z.string().optional().describe('Tags'),
  status: z.string().optional().describe('Prospect status'),
  interestLevel: z
    .string()
    .optional()
    .describe('Interest level (INTERESTED, NOT_INTERESTED, MAYBE_LATER)'),
  campaignId: z.number().optional().describe('Related campaign ID'),
  campaignName: z.string().optional().describe('Related campaign name'),
  replySubject: z.string().optional().describe('Reply email subject (for reply events)'),
  replyMessage: z.string().optional().describe('Reply email body (for reply events)'),
  replyDate: z.string().optional().describe('Reply date (for reply events)'),
  timestamp: z.string().optional().describe('Event timestamp')
});

export let prospectEvents = SlateTrigger.create(spec, {
  name: 'Prospect Events',
  key: 'prospect_events',
  description:
    "Triggered when a prospect's status, interest level, or engagement changes. Covers replies, bounces, blacklisting, interest changes, opt-outs, and more."
})
  .input(webhookInputSchema)
  .output(prospectOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        companyId: ctx.config.companyId
      });

      let registeredEvents: string[] = [];
      for (let event of PROSPECT_EVENTS) {
        try {
          await client.subscribeWebhook(ctx.input.webhookBaseUrl, event);
          registeredEvents.push(event);
        } catch (err: any) {
          // 409 means already subscribed, which is fine
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

      // Woodpecker sends events as arrays (batched, up to 100 per payload)
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

      let eventType = (ctx.input.eventType ?? 'unknown').toLowerCase();

      return {
        type: `prospect.${eventType}`,
        id: `${eventType}_${prospect.id ?? ''}_${payload.timestamp ?? Date.now()}`,
        output: {
          prospectId: prospect.id,
          email: prospect.email,
          firstName: prospect.first_name,
          lastName: prospect.last_name,
          company: prospect.company,
          website: prospect.website,
          title: prospect.title,
          phone: prospect.phone,
          tags: prospect.tags,
          status: prospect.status,
          interestLevel: prospect.interested,
          campaignId: prospect.campaign_id,
          campaignName: prospect.campaign_name,
          replySubject: email.subject,
          replyMessage: email.message,
          replyDate: email.date,
          timestamp: payload.timestamp
        }
      };
    }
  })
  .build();
