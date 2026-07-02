import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    street: z.string().nullable().optional(),
    zipcode: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    countryIso: z.string().nullable().optional(),
    formattedAddress: z.string().nullable().optional(),
    inlineAddress: z.string().nullable().optional()
  })
  .nullable()
  .optional();

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description: 'Triggers when a customer is created, updated, or deleted in Altoviz.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (CustomerCreated, CustomerUpdated, CustomerDeleted)'),
      webhookId: z.string().describe('Webhook ID'),
      customer: z.any().describe('Customer entity data from the webhook payload')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Altoviz customer ID'),
      number: z.string().nullable().optional().describe('Customer number'),
      companyName: z.string().nullable().optional(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      cellPhone: z.string().nullable().optional(),
      type: z.string().nullable().optional(),
      billingAddress: addressSchema,
      shippingAddress: addressSchema,
      internalId: z.string().nullable().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.createWebhook({
        name: 'Slates Customer Events',
        types: ['CustomerCreated', 'CustomerUpdated', 'CustomerDeleted'],
        url: ctx.input.webhookBaseUrl
      });
      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      return {
        inputs: [
          {
            eventType: body.type,
            webhookId: String(body.id),
            customer: body.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let customer = ctx.input.customer || {};
      let eventTypeMap: Record<string, string> = {
        CustomerCreated: 'customer.created',
        CustomerUpdated: 'customer.updated',
        CustomerDeleted: 'customer.deleted'
      };

      return {
        type:
          eventTypeMap[ctx.input.eventType] || `customer.${ctx.input.eventType.toLowerCase()}`,
        id: `${ctx.input.webhookId}-${customer.id || 'unknown'}-${ctx.input.eventType}`,
        output: {
          customerId: customer.id,
          number: customer.number,
          companyName: customer.companyName,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          cellPhone: customer.cellPhone,
          type: customer.type,
          billingAddress: customer.billingAddress,
          shippingAddress: customer.shippingAddress,
          internalId: customer.internalId
        }
      };
    }
  })
  .build();
