import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buyerSchema,
  customFieldSchema,
  mapBuyer,
  mapCustomFields,
  mapProduct,
  productSchema
} from '../lib/schemas';
import { spec } from '../spec';

let webhookPayloadSchema = z.object({
  event: z.string(),
  data: z.any()
});

export let newLeadTrigger = SlateTrigger.create(spec, {
  name: 'New Lead',
  key: 'new_lead',
  description:
    'Triggers when a user submits their name and email to receive a free product or lead magnet. Includes buyer contact information, requested products, and custom fields.'
})
  .input(webhookPayloadSchema)
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      createdAt: z.string().describe('Submission timestamp'),
      buyer: buyerSchema.describe('Lead contact information'),
      products: z.array(productSchema).describe('Free products requested'),
      customFields: z.array(customFieldSchema).describe('Custom checkout fields')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.subscribeWebhook('lead', ctx.input.webhookBaseUrl);
      return {
        registrationDetails: {
          webhookUrl: result.webhook,
          signingSecret: result.signing_secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.unsubscribeWebhook(ctx.input.registrationDetails.webhookUrl as string);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as { event: string; data: unknown };
      return {
        inputs: [body]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.data as Record<string, unknown>;

      let buyer = mapBuyer((data.buyer || {}) as Record<string, unknown>);
      let products = ((data.products || []) as Record<string, unknown>[]).map(mapProduct);
      let customFields = mapCustomFields(
        data.custom_fields as Record<string, unknown>[] | undefined
      );

      return {
        type: 'lead.created',
        id: data.transaction_id as string,
        output: {
          transactionId: data.transaction_id as string,
          createdAt: data.created_at as string,
          buyer,
          products,
          customFields
        }
      };
    }
  })
  .build();
