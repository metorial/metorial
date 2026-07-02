import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description:
    'Triggers when customers are created, updated, or deleted. Also fires for customer address changes. Fetches the full customer details for each event.'
})
  .input(
    z.object({
      scope: z.string().describe('The webhook scope (e.g., store/customer/created)'),
      customerId: z.number().describe('The customer ID from the webhook payload'),
      webhookEventHash: z.string().describe('Unique hash for the webhook event')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('The customer ID'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      email: z.string().optional().describe('Customer email address'),
      company: z.string().optional().describe('Customer company'),
      phone: z.string().optional().describe('Customer phone'),
      dateCreated: z.string().optional().describe('Date the customer was created'),
      dateModified: z.string().optional().describe('Date the customer was last modified'),
      customerGroupId: z.number().optional().describe('Customer group ID'),
      customerDetails: z.any().optional().describe('Full customer object from the API')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let scopes = [
        'store/customer/created',
        'store/customer/updated',
        'store/customer/deleted',
        'store/customer/address/created',
        'store/customer/address/updated',
        'store/customer/address/deleted'
      ];

      let webhookIds: number[] = [];
      for (let scope of scopes) {
        let result = await client.createWebhook({
          scope,
          destination: ctx.input.webhookBaseUrl,
          is_active: true
        });
        webhookIds.push(result.data.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let { webhookIds } = ctx.input.registrationDetails as { webhookIds: number[] };
      for (let webhookId of webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let scope = body.scope as string;
      let customerId = body.data?.id as number;
      let hash = (body.hash as string) || `${scope}-${customerId}-${Date.now()}`;

      return {
        inputs: [
          {
            scope,
            customerId,
            webhookEventHash: hash
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let scopeParts = ctx.input.scope.replace('store/customer/', '');
      let eventType = `customer.${scopeParts.replace('/', '_')}`;

      let customerDetails: any = null;
      if (!ctx.input.scope.includes('deleted')) {
        try {
          let result = await client.getCustomer(ctx.input.customerId);
          customerDetails = result.data?.[0] || null;
        } catch {
          // Customer may have been deleted
        }
      }

      return {
        type: eventType,
        id: ctx.input.webhookEventHash,
        output: {
          customerId: ctx.input.customerId,
          firstName: customerDetails?.first_name,
          lastName: customerDetails?.last_name,
          email: customerDetails?.email,
          company: customerDetails?.company,
          phone: customerDetails?.phone,
          dateCreated: customerDetails?.date_created,
          dateModified: customerDetails?.date_modified,
          customerGroupId: customerDetails?.customer_group_id,
          customerDetails
        }
      };
    }
  })
  .build();
