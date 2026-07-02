import { SlateTool } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let createCheckout = SlateTool.create(spec, {
  name: 'Create Checkout',
  key: 'create_checkout',
  description: `Create a hosted checkout session for collecting payments. Generates a checkout URL that customers can visit to complete a payment. Supports optional form fields (Email, Name), product attachments with quantities, custom redirect URLs, and metadata.`,
  instructions: [
    "The username field defaults to the authenticated user's username if configured.",
    'Use the fields parameter to collect customer information like Email or Name.',
    'Use disablePayments to exclude specific payment methods from the checkout.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      username: z.string().describe('Merchant username on Poof'),
      amount: z.string().describe('Payment amount as a string (e.g., "10.00")'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Form fields to display (e.g., ["Email", "Name"])'),
      disablePayments: z
        .array(z.string())
        .optional()
        .describe('Payment methods to disable (e.g., ["paypal", "bitcoin"])'),
      successUrl: z
        .string()
        .optional()
        .describe('URL to redirect to after successful payment'),
      redirectUrl: z.string().optional().describe('General redirect destination URL'),
      productId: z.string().optional().describe('Product ID to attach to the checkout'),
      productQuantity: z.string().optional().describe('Quantity of the product'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL for instant payment notification webhook'),
      defaultValues: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Pre-filled customer data (e.g., { "name": "Bob", "email": "bob@example.com" })'
        ),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata to attach to the checkout')
    })
  )
  .output(
    z.object({
      checkoutUrl: z.string().describe('URL to the hosted checkout page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PoofClient({ token: ctx.auth.token });

    let result = await client.createCheckout({
      username: ctx.input.username,
      amount: ctx.input.amount,
      fields: ctx.input.fields,
      disablePayments: ctx.input.disablePayments,
      successUrl: ctx.input.successUrl,
      redirect: ctx.input.redirectUrl,
      productId: ctx.input.productId,
      productQuantity: ctx.input.productQuantity,
      instantPaymentNotification: ctx.input.webhookUrl,
      defaultValues: ctx.input.defaultValues,
      metadata: ctx.input.metadata
    });

    let checkoutUrl =
      typeof result === 'string'
        ? result
        : result?.checkout_url || result?.url || JSON.stringify(result);

    return {
      output: {
        checkoutUrl
      },
      message: `Checkout session created for **${ctx.input.amount}**. Checkout URL: ${checkoutUrl}`
    };
  })
  .build();
