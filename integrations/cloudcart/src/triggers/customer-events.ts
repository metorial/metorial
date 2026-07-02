import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customerEventTypes = ['customer.created', 'customer.updated', 'customer.deleted'] as const;

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description:
    'Triggers when a customer is created, updated, or deleted in the CloudCart store.'
})
  .input(
    z.object({
      eventType: z.enum(customerEventTypes).describe('The type of customer event'),
      customerId: z.string().describe('ID of the affected customer'),
      customerAttributes: z
        .record(z.string(), z.any())
        .describe('Customer attributes from the webhook payload')
    })
  )
  .output(
    z.object({
      customerId: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      active: z.any().optional(),
      newsletter: z.any().optional(),
      marketing: z.any().optional(),
      dateAdded: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

      let webhookIds: string[] = [];
      for (let event of customerEventTypes) {
        let res = await client.createWebhook({
          url: ctx.input.webhookBaseUrl,
          event
        });
        webhookIds.push(res.data.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_err) {
          // Webhook may already be deleted or deactivated
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;

      let data = body.data;
      if (!data) {
        return { inputs: [] };
      }

      let eventType: string = 'customer.updated';
      if (body.event) {
        eventType = body.event;
      }

      let resource = Array.isArray(data) ? data[0] : data;
      if (!resource) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: eventType as (typeof customerEventTypes)[number],
            customerId: String(resource.id || ''),
            customerAttributes: (resource.attributes || resource) as Record<string, any>
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs = ctx.input.customerAttributes as Record<string, any>;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.customerId}-${Date.now()}`,
        output: {
          customerId: ctx.input.customerId,
          firstName: attrs.first_name as string | undefined,
          lastName: attrs.last_name as string | undefined,
          email: attrs.email as string | undefined,
          active: attrs.active,
          newsletter: attrs.newsletter,
          marketing: attrs.marketing,
          dateAdded: attrs.date_added as string | undefined,
          updatedAt: attrs.updated_at as string | undefined
        }
      };
    }
  })
  .build();
