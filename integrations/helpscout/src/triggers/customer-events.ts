import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

let CUSTOMER_EVENTS = ['customer.created', 'customer.updated', 'customer.deleted'] as const;

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description:
    'Triggered when customers are created, updated, or deleted. The customer.created event fires globally across all mailboxes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Help Scout event type'),
      customerId: z.number().describe('Customer ID'),
      firstName: z.string().nullable().describe('Customer first name'),
      lastName: z.string().nullable().describe('Customer last name'),
      email: z.string().nullable().describe('Primary email'),
      webhookId: z.string().describe('Webhook delivery identifier')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Customer ID'),
      firstName: z.string().nullable().describe('Customer first name'),
      lastName: z.string().nullable().describe('Customer last name'),
      email: z.string().nullable().describe('Primary email')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let secret = crypto.randomUUID();
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...CUSTOMER_EVENTS],
        secret,
        payloadVersion: 'V2'
      });

      return {
        registrationDetails: {
          webhookId: result.webhookId,
          secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(Number(webhookId));
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;
      let eventType = data?.event ?? data?.eventType ?? '';
      let customer = data?.payload?.customer ?? data?.customer ?? data ?? {};

      let customerId = customer.id ?? 0;
      let firstName = customer.firstName ?? null;
      let lastName = customer.lastName ?? null;
      let email = customer.email ?? customer._embedded?.emails?.[0]?.value ?? null;

      let webhookId = `${eventType}-${customerId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            customerId,
            firstName,
            lastName,
            email,
            webhookId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'customer.created': 'customer.created',
        'customer.updated': 'customer.updated',
        'customer.deleted': 'customer.deleted'
      };

      return {
        type: typeMap[ctx.input.eventType] ?? `customer.${ctx.input.eventType}`,
        id: ctx.input.webhookId,
        output: {
          customerId: ctx.input.customerId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email
        }
      };
    }
  })
  .build();
