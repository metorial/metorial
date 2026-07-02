import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCheckoutTool = SlateTool.create(spec, {
  name: 'Create Checkout',
  key: 'create_checkout',
  description: `Create a custom checkout URL for a specific product variant. Supports custom pricing, pre-filled customer data, discount codes, checkout UI customization, and expiration dates. Returns a shareable checkout URL.`,
  instructions: [
    'A store ID is required. Use the config store ID or provide one explicitly.',
    'The variant ID corresponds to a specific product pricing tier.'
  ]
})
  .input(
    z.object({
      storeId: z
        .string()
        .optional()
        .describe('Store ID. Falls back to the configured store ID if not provided.'),
      variantId: z.string().describe('The ID of the product variant for this checkout'),
      customPrice: z
        .number()
        .optional()
        .describe('Custom price in cents (e.g., 999 for $9.99)'),
      customerEmail: z.string().optional().describe('Pre-fill customer email'),
      customerName: z.string().optional().describe('Pre-fill customer name'),
      discountCode: z.string().optional().describe('Apply a discount code to the checkout'),
      customData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata to attach to the checkout'),
      redirectUrl: z
        .string()
        .optional()
        .describe('URL to redirect to after successful purchase'),
      buttonColor: z
        .string()
        .optional()
        .describe('Hex color for the checkout button (e.g., #7047EB)'),
      skipTrial: z
        .boolean()
        .optional()
        .describe('Skip the free trial for subscription products'),
      expiresAt: z
        .string()
        .optional()
        .describe('ISO 8601 date-time when the checkout expires'),
      testMode: z.boolean().optional().describe('Create checkout in test mode')
    })
  )
  .output(
    z.object({
      checkoutId: z.string(),
      checkoutUrl: z.string(),
      expiresAt: z.string().nullable(),
      createdAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let storeId = ctx.input.storeId || ctx.config.storeId;

    if (!storeId) {
      throw new Error(
        'Store ID is required. Provide it in the input or configure it in the provider settings.'
      );
    }

    let checkoutData: Record<string, unknown> = {};
    if (ctx.input.customerEmail) checkoutData.email = ctx.input.customerEmail;
    if (ctx.input.customerName) checkoutData.name = ctx.input.customerName;
    if (ctx.input.discountCode) checkoutData.discount_code = ctx.input.discountCode;
    if (ctx.input.customData) checkoutData.custom = ctx.input.customData;

    let checkoutOptions: Record<string, unknown> = {};
    if (ctx.input.buttonColor) checkoutOptions.button_color = ctx.input.buttonColor;
    if (ctx.input.skipTrial !== undefined) checkoutOptions.skip_trial = ctx.input.skipTrial;

    let productOptions: Record<string, unknown> = {};
    if (ctx.input.redirectUrl) productOptions.redirect_url = ctx.input.redirectUrl;

    let response = await client.createCheckout(storeId, ctx.input.variantId, {
      customPrice: ctx.input.customPrice,
      checkoutData: Object.keys(checkoutData).length > 0 ? checkoutData : undefined,
      checkoutOptions: Object.keys(checkoutOptions).length > 0 ? checkoutOptions : undefined,
      productOptions: Object.keys(productOptions).length > 0 ? productOptions : undefined,
      expiresAt: ctx.input.expiresAt,
      testMode: ctx.input.testMode
    });

    let checkout = response.data;

    return {
      output: {
        checkoutId: checkout.id,
        checkoutUrl: checkout.attributes.url,
        expiresAt: checkout.attributes.expires_at,
        createdAt: checkout.attributes.created_at
      },
      message: `Checkout created: ${checkout.attributes.url}`
    };
  })
  .build();
