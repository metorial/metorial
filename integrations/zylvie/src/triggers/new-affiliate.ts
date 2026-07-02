import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapProduct, productSchema } from '../lib/schemas';
import { spec } from '../spec';

let webhookPayloadSchema = z.object({
  event: z.string(),
  data: z.any()
});

export let newAffiliateTrigger = SlateTrigger.create(spec, {
  name: 'New Affiliate Sign-Up',
  key: 'new_affiliate',
  description:
    'Triggers when a visitor signs up to be an affiliate or accepts an invitation to become one. Includes affiliate details, commission rates, and allowed products.'
})
  .input(webhookPayloadSchema)
  .output(
    z.object({
      acceptedAt: z.string().describe('Timestamp when the affiliate signed up or accepted'),
      affiliateUsername: z.string().describe('Affiliate username'),
      affiliateName: z.string().describe('Affiliate full name'),
      affiliateEmail: z.string().describe('Affiliate email'),
      commissionPercentage: z.number().nullable().describe('Commission percentage rate'),
      commissionAmount: z.number().nullable().describe('Fixed commission amount'),
      allowedForAllProducts: z
        .boolean()
        .describe('Whether affiliate can promote all products'),
      allowedProducts: z
        .array(productSchema)
        .describe('Specific products the affiliate can promote')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.subscribeWebhook('affiliate', ctx.input.webhookBaseUrl);
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
      let affiliate = (data.affiliate || {}) as Record<string, unknown>;
      let productsData = (data.products || {}) as Record<string, unknown>;
      let allowedProducts = (
        (productsData.allowed_products || []) as Record<string, unknown>[]
      ).map(mapProduct);

      return {
        type: 'affiliate.created',
        id: `${affiliate.email}-${data.accepted_at}`,
        output: {
          acceptedAt: data.accepted_at as string,
          affiliateUsername: affiliate.username as string,
          affiliateName: affiliate.name as string,
          affiliateEmail: affiliate.email as string,
          commissionPercentage: (data.commission_percentage as number | null) ?? null,
          commissionAmount: (data.commission_amount as number | null) ?? null,
          allowedForAllProducts: (productsData.allowed_for_all_products as boolean) || false,
          allowedProducts
        }
      };
    }
  })
  .build();
