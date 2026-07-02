import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let emailEvents = SlateTrigger.create(spec, {
  name: 'Email Events',
  key: 'email_events',
  description:
    'Triggers when email activity occurs in your sequences, including emails sent, replied, opened, clicked, or bounced.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of email event'),
      eventId: z.string().describe('Unique event identifier'),
      contactEmail: z.string().optional().describe('Contact email address'),
      contactFirstName: z.string().optional().describe('Contact first name'),
      contactLastName: z.string().optional().describe('Contact last name'),
      sequenceId: z.number().optional().describe('Sequence ID'),
      sequenceName: z.string().optional().describe('Sequence name'),
      campaignId: z.number().optional().describe('Campaign ID'),
      subject: z.string().optional().describe('Email subject'),
      sentAt: z.string().optional().describe('When the email was sent'),
      payload: z.record(z.string(), z.any()).describe('Full event payload')
    })
  )
  .output(
    z.object({
      contactEmail: z.string().optional().describe('Contact email address'),
      contactFirstName: z.string().optional().describe('Contact first name'),
      contactLastName: z.string().optional().describe('Contact last name'),
      sequenceId: z.number().optional().describe('Sequence ID'),
      sequenceName: z.string().optional().describe('Sequence name'),
      campaignId: z.number().optional().describe('Campaign ID'),
      subject: z.string().optional().describe('Email subject line'),
      sentAt: z.string().optional().describe('When the email was sent'),
      rawEvent: z.record(z.string(), z.any()).describe('Full event data from Reply.io')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        eventTypes: [
          'email_sent',
          'email_replied',
          'email_opened',
          'email_clicked',
          'email_bounced'
        ],
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

      // Reply.io may send a single event or an array
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
          sequenceId: event.sequenceId ?? event.campaignId ?? event.campaign_id,
          sequenceName: event.sequenceName ?? event.campaignName,
          campaignId: event.campaignId ?? event.campaign_id,
          subject: event.subject ?? event.emailSubject,
          sentAt: event.sentAt ?? event.sent_at ?? event.timestamp,
          payload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `email.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          contactEmail: ctx.input.contactEmail,
          contactFirstName: ctx.input.contactFirstName,
          contactLastName: ctx.input.contactLastName,
          sequenceId: ctx.input.sequenceId,
          sequenceName: ctx.input.sequenceName,
          campaignId: ctx.input.campaignId,
          subject: ctx.input.subject,
          sentAt: ctx.input.sentAt,
          rawEvent: ctx.input.payload
        }
      };
    }
  })
  .build();
