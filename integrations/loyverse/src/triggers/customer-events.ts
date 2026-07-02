import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description:
    'Triggers when a customer record is created, updated, or deleted. Useful for syncing customer data to external CRM systems.'
})
  .input(
    z.object({
      customerId: z.string().describe('Customer ID'),
      webhookType: z.string().describe('Webhook event type'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('Customer ID'),
      customerName: z.string().nullable().optional().describe('Customer name'),
      email: z.string().nullable().optional().describe('Email'),
      phoneNumber: z.string().nullable().optional().describe('Phone number'),
      address: z.string().nullable().optional().describe('Address'),
      city: z.string().nullable().optional().describe('City'),
      postalCode: z.string().nullable().optional().describe('Postal code'),
      countryCode: z.string().nullable().optional().describe('Country code'),
      customerCode: z.string().nullable().optional().describe('Loyalty code'),
      totalPoints: z.number().optional().describe('Total loyalty points'),
      totalMoneySpent: z.number().optional().describe('Total money spent'),
      isDeleted: z.boolean().optional().describe('Whether the customer was deleted'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      deletedAt: z.string().nullable().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        types: ['customers.update']
      });

      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let customerId = body.customer_id ?? body.id ?? '';
      let webhookType = body.type ?? 'customers.update';

      return {
        inputs: [
          {
            customerId,
            webhookType,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      try {
        let c = await client.getCustomer(ctx.input.customerId);

        return {
          type: c.deleted_at ? 'customer.deleted' : 'customer.updated',
          id: `${ctx.input.customerId}-${c.updated_at ?? Date.now()}`,
          output: {
            customerId: c.id,
            customerName: c.name,
            email: c.email,
            phoneNumber: c.phone_number,
            address: c.address,
            city: c.city,
            postalCode: c.postal_code,
            countryCode: c.country_code,
            customerCode: c.customer_code,
            totalPoints: c.total_points,
            totalMoneySpent: c.total_money_spent,
            isDeleted: !!c.deleted_at,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            deletedAt: c.deleted_at
          }
        };
      } catch {
        return {
          type: 'customer.deleted',
          id: `${ctx.input.customerId}-deleted`,
          output: {
            customerId: ctx.input.customerId,
            isDeleted: true
          }
        };
      }
    }
  })
  .build();
