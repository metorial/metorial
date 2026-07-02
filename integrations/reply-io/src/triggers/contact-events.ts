import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers on contact lifecycle changes including contacts added, opted out, or finished in a sequence.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of contact event'),
      eventId: z.string().describe('Unique event identifier'),
      contactEmail: z.string().optional().describe('Contact email address'),
      contactFirstName: z.string().optional().describe('Contact first name'),
      contactLastName: z.string().optional().describe('Contact last name'),
      contactId: z.number().optional().describe('Contact ID'),
      sequenceId: z.number().optional().describe('Sequence ID'),
      sequenceName: z.string().optional().describe('Sequence name'),
      campaignId: z.number().optional().describe('Campaign ID'),
      finishReason: z
        .string()
        .optional()
        .describe('Reason the contact finished (for contact_finished events)'),
      payload: z.record(z.string(), z.any()).describe('Full event payload')
    })
  )
  .output(
    z.object({
      contactEmail: z.string().optional().describe('Contact email address'),
      contactFirstName: z.string().optional().describe('Contact first name'),
      contactLastName: z.string().optional().describe('Contact last name'),
      contactId: z.number().optional().describe('Contact ID'),
      sequenceId: z.number().optional().describe('Sequence ID'),
      sequenceName: z.string().optional().describe('Sequence name'),
      campaignId: z.number().optional().describe('Campaign ID'),
      finishReason: z.string().optional().describe('Reason the contact finished'),
      rawEvent: z.record(z.string(), z.any()).describe('Full event data from Reply.io')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        eventTypes: ['contact_added', 'contact_opted_out', 'contact_finished'],
        subscriptionLevel: 'account'
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

      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let eventType = event.eventType ?? event.event_type ?? event.type ?? 'unknown';
        let eventId =
          event.id ?? event.eventId ?? `${eventType}_${event.email ?? ''}_${Date.now()}`;

        return {
          eventType,
          eventId: String(eventId),
          contactEmail: event.email ?? event.contactEmail ?? event.person?.email,
          contactFirstName: event.firstName ?? event.person?.firstName,
          contactLastName: event.lastName ?? event.person?.lastName,
          contactId: event.contactId ?? event.personId ?? event.person?.id,
          sequenceId: event.sequenceId ?? event.campaignId ?? event.campaign_id,
          sequenceName: event.sequenceName ?? event.campaignName,
          campaignId: event.campaignId ?? event.campaign_id,
          finishReason: event.finishReason ?? event.finish_reason,
          payload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `contact.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          contactEmail: ctx.input.contactEmail,
          contactFirstName: ctx.input.contactFirstName,
          contactLastName: ctx.input.contactLastName,
          contactId: ctx.input.contactId,
          sequenceId: ctx.input.sequenceId,
          sequenceName: ctx.input.sequenceName,
          campaignId: ctx.input.campaignId,
          finishReason: ctx.input.finishReason,
          rawEvent: ctx.input.payload
        }
      };
    }
  })
  .build();
