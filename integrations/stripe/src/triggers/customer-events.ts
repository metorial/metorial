import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { spec } from '../spec';

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description:
    'Triggered when customer-related events occur, including customer creation, updates, deletion, and changes to payment sources or payment methods.'
})
  .input(
    z.object({
      eventId: z.string().describe('Stripe event ID'),
      eventType: z.string().describe('Event type (e.g., customer.created)'),
      resourceId: z.string().describe('Customer ID'),
      resource: z.any().describe('Full customer object from the event'),
      created: z.number().describe('Event creation timestamp')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('Customer ID'),
      email: z.string().optional().nullable().describe('Customer email'),
      name: z.string().optional().nullable().describe('Customer name'),
      phone: z.string().optional().nullable().describe('Customer phone'),
      description: z.string().optional().nullable().describe('Customer description'),
      deleted: z.boolean().optional().describe('Whether the customer was deleted'),
      created: z.number().optional().describe('Customer creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new StripeClient({
        token: ctx.auth.token,
        stripeAccountId: ctx.config.stripeAccountId
      });

      let result = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        enabled_events: [
          'customer.created',
          'customer.updated',
          'customer.deleted',
          'customer.source.created',
          'customer.source.deleted',
          'customer.source.updated'
        ]
      });

      return {
        registrationDetails: {
          webhookEndpointId: result.id,
          secret: result.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new StripeClient({
        token: ctx.auth.token,
        stripeAccountId: ctx.config.stripeAccountId
      });

      await client.deleteWebhookEndpoint(ctx.input.registrationDetails.webhookEndpointId);
    },

    handleRequest: async ctx => {
      let body: any = await ctx.request.json();

      if (!body?.type || !body.data?.object) {
        return { inputs: [] };
      }

      let obj = body.data.object;

      // For customer.source.* events, the object is the source, not the customer
      let resourceId = obj.object === 'customer' ? obj.id : obj.customer || obj.id;

      return {
        inputs: [
          {
            eventId: body.id,
            eventType: body.type,
            resourceId,
            resource: obj,
            created: body.created
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { resource } = ctx.input;

      // For source events, the resource may be the source object, not the customer
      let isCustomerObject = resource.object === 'customer';

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          customerId: ctx.input.resourceId,
          email: isCustomerObject ? resource.email || null : null,
          name: isCustomerObject ? resource.name || null : null,
          phone: isCustomerObject ? resource.phone || null : null,
          description: isCustomerObject ? resource.description || null : null,
          deleted: resource.deleted || false,
          created: isCustomerObject ? resource.created : undefined
        }
      };
    }
  })
  .build();
