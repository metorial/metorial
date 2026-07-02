import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let loyaltyEvents = SlateTrigger.create(spec, {
  name: 'Loyalty Events',
  key: 'loyalty_events',
  description: 'Triggers when a new credit reception is created for a contact.'
})
  .input(
    z.object({
      eventType: z.literal('credit_reception_created').describe('Type of loyalty event'),
      webhookUuid: z.string().optional().describe('Unique event identifier'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      creditReceptionUuid: z.string().describe('UUID of the credit reception'),
      contactUuid: z.string().optional().describe('UUID of the contact'),
      contactEmail: z.string().optional().describe('Email of the contact'),
      credits: z.number().optional().describe('Number of credits awarded'),
      unitValue: z.number().optional().describe('Unit value used'),
      unitName: z.string().optional().describe('Name of the unit'),
      shopUuid: z.string().optional().describe('UUID of the shop'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.createWebhookSubscription({
        name: 'Slates - credit_reception_created',
        eventType: 'credit_reception_created',
        url: ctx.input.webhookBaseUrl
      });
      let sub = result.data || result;
      return { registrationDetails: { subscriptionUuid: sub.uuid } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { subscriptionUuid: string };
      await client.deleteWebhookSubscription(details.subscriptionUuid);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      return {
        inputs: [
          {
            eventType: 'credit_reception_created' as const,
            webhookUuid: body.uuid || body.id || `credit-${Date.now()}`,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.rawPayload?.data || ctx.input.rawPayload || {};

      return {
        type: 'credit_reception.created',
        id: ctx.input.webhookUuid || `credit-${Date.now()}`,
        output: {
          creditReceptionUuid: data.uuid || '',
          contactUuid: data.contact?.uuid,
          contactEmail: data.contact?.email,
          credits: data.credits,
          unitValue: data.unit_value,
          unitName: data.unit?.name,
          shopUuid: data.shop?.uuid,
          createdAt: data.created_at
        }
      };
    }
  })
  .build();
