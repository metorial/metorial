import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let CONTACT_TOPICS = ['contact_added', 'contact_changed'];

export let contactEventsTrigger = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description: 'Triggered when a contact is added or modified in AccuLynx.'
})
  .input(
    z.object({
      topicName: z.string().describe('The webhook topic name'),
      eventId: z.string().describe('Unique event identifier'),
      contactId: z.string().optional().describe('ID of the affected contact'),
      payload: z.record(z.string(), z.any()).describe('Raw event payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('ID of the affected contact'),
      topicName: z.string().describe('The webhook topic that fired'),
      eventData: z.record(z.string(), z.any()).describe('Full event data from AccuLynx')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let subscription = await client.createSubscription({
        consumerUrl: ctx.input.webhookBaseUrl,
        techContact: 'webhooks@slates.dev',
        topicNames: CONTACT_TOPICS
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.subscriptionId ?? subscription.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subscriptionId = ctx.input.registrationDetails?.subscriptionId;
      if (subscriptionId) {
        await client.deleteSubscription(subscriptionId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => ({
        topicName: event.topicName ?? event.topic ?? event.type ?? 'contact_changed',
        eventId: event.eventId ?? event.id ?? crypto.randomUUID(),
        contactId: event.contactId ?? event.data?.contactId ?? event.data?.id,
        payload: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let topicName = ctx.input.topicName;
      let type = topicName === 'contact_added' ? 'contact.added' : 'contact.changed';

      return {
        type,
        id: ctx.input.eventId,
        output: {
          contactId: ctx.input.contactId,
          topicName,
          eventData: ctx.input.payload
        }
      };
    }
  })
  .build();
