import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let checkoutSessionOutputSchema = z.object({
  sessionId: z.string().optional().describe('Checkout session ID'),
  status: z.string().optional().describe('Session status'),
  cancelUrl: z.string().optional().describe('URL to redirect on cancel'),
  successUrl: z.string().optional().describe('URL to redirect on success'),
  url: z.string().optional().describe('Checkout page URL'),
  currency: z.string().optional().describe('Currency code'),
  customerEmail: z.string().optional().describe('Customer email'),
  customerTaxId: z.string().optional().describe('Customer tax ID'),
  customerCountry: z.string().optional().describe('Customer country'),
  billingAddressCollection: z
    .boolean()
    .optional()
    .describe('Whether billing address is collected')
});

export let listCheckoutSessions = SlateTool.create(spec, {
  name: 'List Checkout Sessions',
  key: 'list_checkout_sessions',
  description: `Retrieve a list of checkout sessions from Quaderno. Abandoned sessions are automatically removed after seven days.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      sessions: z.array(checkoutSessionOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listCheckoutSessions({ page: ctx.input.page });

    let sessions = (Array.isArray(result) ? result : []).map((s: any) => ({
      sessionId: s.id?.toString(),
      status: s.status,
      cancelUrl: s.cancel_url,
      successUrl: s.success_url,
      url: s.url,
      currency: s.currency,
      customerEmail: s.customer_email,
      customerTaxId: s.customer_tax_id,
      customerCountry: s.customer_country,
      billingAddressCollection: s.billing_address_collection
    }));

    return {
      output: { sessions },
      message: `Found **${sessions.length}** checkout session(s)`
    };
  })
  .build();

export let createCheckoutSession = SlateTool.create(spec, {
  name: 'Create Checkout Session',
  key: 'create_checkout_session',
  description: `Create a new checkout session in Quaderno. Returns a URL to redirect your customer to complete payment.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      successUrl: z.string().describe('URL to redirect the customer after successful payment'),
      cancelUrl: z.string().describe('URL to redirect the customer if they cancel'),
      currency: z.string().optional().describe('Currency code (e.g., "USD", "EUR")'),
      customerEmail: z.string().optional().describe('Pre-fill customer email'),
      customerTaxId: z.string().optional().describe('Pre-fill customer tax ID'),
      customerCountry: z.string().optional().describe('Pre-fill customer country code'),
      billingAddressCollection: z
        .boolean()
        .optional()
        .describe('Whether to collect billing address'),
      items: z
        .array(
          z.object({
            productCode: z.string().optional().describe('Product code'),
            description: z.string().optional().describe('Item description'),
            amount: z.string().optional().describe('Item amount'),
            quantity: z.number().optional().describe('Quantity'),
            currency: z.string().optional().describe('Currency code')
          })
        )
        .optional()
        .describe('Line items for the checkout'),
      customMetadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs')
    })
  )
  .output(checkoutSessionOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      success_url: ctx.input.successUrl,
      cancel_url: ctx.input.cancelUrl
    };

    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.customerEmail) data.customer_email = ctx.input.customerEmail;
    if (ctx.input.customerTaxId) data.customer_tax_id = ctx.input.customerTaxId;
    if (ctx.input.customerCountry) data.customer_country = ctx.input.customerCountry;
    if (ctx.input.billingAddressCollection !== undefined)
      data.billing_address_collection = ctx.input.billingAddressCollection;
    if (ctx.input.customMetadata) data.custom_metadata = ctx.input.customMetadata;

    if (ctx.input.items) {
      data.items_attributes = ctx.input.items.map(item => {
        let mapped: Record<string, any> = {};
        if (item.productCode) mapped.product_code = item.productCode;
        if (item.description) mapped.description = item.description;
        if (item.amount) mapped.amount = item.amount;
        if (item.quantity !== undefined) mapped.quantity = item.quantity;
        if (item.currency) mapped.currency = item.currency;
        return mapped;
      });
    }

    let s = await client.createCheckoutSession(data);

    return {
      output: {
        sessionId: s.id?.toString(),
        status: s.status,
        cancelUrl: s.cancel_url,
        successUrl: s.success_url,
        url: s.url,
        currency: s.currency,
        customerEmail: s.customer_email,
        customerTaxId: s.customer_tax_id,
        customerCountry: s.customer_country,
        billingAddressCollection: s.billing_address_collection
      },
      message: `Created checkout session${s.url ? ` — [Checkout URL](${s.url})` : ` **${s.id}**`}`
    };
  })
  .build();
