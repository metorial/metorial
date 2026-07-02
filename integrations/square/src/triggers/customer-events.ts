import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let CUSTOMER_EVENT_TYPES = ['customer.created', 'customer.updated', 'customer.deleted'];

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description: 'Triggered when customer profiles are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string(),
      eventId: z.string(),
      merchantId: z.string().optional(),
      createdAt: z.string().optional(),
      rawCustomer: z.record(z.string(), z.any())
    })
  )
  .output(
    z.object({
      customerId: z.string().optional(),
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      emailAddress: z.string().optional(),
      phoneNumber: z.string().optional(),
      companyName: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let subscription = await client.createWebhookSubscription({
        idempotencyKey: crypto.randomUUID(),
        subscription: {
          name: 'Square Customer Events',
          eventTypes: CUSTOMER_EVENT_TYPES,
          notificationUrl: ctx.input.webhookBaseUrl
        }
      });
      return { registrationDetails: { subscriptionId: subscription.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      await client.deleteWebhookSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      if (!body?.type) return { inputs: [] };

      let customer = body.data?.object?.customer || body.data?.object || {};

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.event_id || crypto.randomUUID(),
            merchantId: body.merchant_id,
            createdAt: body.created_at,
            rawCustomer: customer
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.rawCustomer as any;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          customerId: c.id,
          givenName: c.given_name,
          familyName: c.family_name,
          emailAddress: c.email_address,
          phoneNumber: c.phone_number,
          companyName: c.company_name,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }
      };
    }
  })
  .build();
