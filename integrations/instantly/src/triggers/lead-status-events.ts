import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let leadStatusEvents = SlateTrigger.create(spec, {
  name: 'Lead Status Events',
  key: 'lead_status_events',
  description:
    'Triggers on lead status changes including interested, not interested, unsubscribed, meeting booked, meeting completed, closed, out of office, wrong person, and neutral.'
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
      leadEmail: z.string().optional().describe('Lead email address'),
      firstName: z.string().optional().describe('Lead first name'),
      lastName: z.string().optional().describe('Lead last name'),
      companyName: z.string().optional().describe('Lead company name'),
      campaignId: z.string().optional().describe('Associated campaign ID'),
      campaignName: z.string().optional().describe('Campaign name'),
      interestStatus: z.number().optional().describe('Interest status value'),
      rawPayload: z.any().optional().describe('Full event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        targetHookUrl: ctx.input.webhookBaseUrl,
        eventType: 'all_events',
        name: 'Slates Lead Status Events'
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

      let leadStatusEventTypes = [
        'lead_unsubscribed',
        'lead_neutral',
        'lead_interested',
        'lead_not_interested',
        'lead_out_of_office',
        'lead_wrong_person',
        'lead_closed',
        'lead_meeting_booked',
        'lead_meeting_completed'
      ];

      if (!leadStatusEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

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
          leadEmail: payload.lead_email ?? payload.email,
          firstName: payload.first_name ?? payload.lead_first_name,
          lastName: payload.last_name ?? payload.lead_last_name,
          companyName: payload.company_name ?? payload.lead_company_name,
          campaignId: payload.campaign_id ?? payload.campaign,
          campaignName: payload.campaign_name,
          interestStatus: payload.interest_value ?? payload.lt_interest_status,
          rawPayload: payload
        }
      };
    }
  })
  .build();
