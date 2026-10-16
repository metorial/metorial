import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { storeIdSchema } from '../lib/schemas';
import { providerAmount } from '../lib/values';
import { spec } from '../spec';

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new payment invoice for a store. Invoices are the primary way to accept cryptocurrency payments. Supports configurable amounts, currencies, order IDs, buyer emails, custom metadata, and expiration.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      storeId: storeIdSchema,
      amount: z
        .number()
        .optional()
        .describe(
          'Invoice amount. Omit for a "top-up" invoice where the buyer decides the amount.'
        ),
      amountExact: z
        .string()
        .optional()
        .describe(
          'Exact decimal invoice amount. Use instead of amount to avoid number rounding.'
        ),
      currency: z
        .string()
        .optional()
        .describe(
          'Currency code (e.g., USD, BTC, EUR). Defaults to the store default currency.'
        ),
      orderId: z
        .string()
        .optional()
        .describe('Order ID for correlating with external systems'),
      buyerEmail: z.string().optional().describe('Buyer email address'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom key-value metadata to attach to the invoice'),
      expirationMinutes: z.number().optional().describe('Invoice expiration time in minutes'),
      redirectUrl: z.string().optional().describe('URL to redirect the buyer after payment'),
      paymentMethods: z
        .array(z.string())
        .optional()
        .describe('Restrict to specific payment methods (e.g., ["BTC-CHAIN", "BTC-LN"])')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Created invoice ID'),
      status: z.string().describe('Invoice status'),
      amount: z
        .number()
        .optional()
        .describe('Invoice amount as a number; amountExact retains the provider decimal.'),
      amountExact: z
        .string()
        .optional()
        .describe('Exact invoice amount as returned by the provider'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete invoice data'),
      currency: z.string().optional().describe('Invoice currency'),
      checkoutLink: z.string().optional().describe('URL for the checkout page'),
      createdTime: z.string().optional().describe('Invoice creation timestamp'),
      expirationTime: z.string().optional().describe('Invoice expiration timestamp'),
      metadata: z.record(z.string(), z.unknown()).optional().describe('Invoice metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    if (ctx.input.amountExact !== undefined && ctx.input.amount !== undefined) {
      throw createApiServiceError('Use either amount or amountExact, not both.');
    }
    let checkout: Record<string, unknown> = {};
    if (ctx.input.redirectUrl !== undefined) checkout.redirectURL = ctx.input.redirectUrl;
    if (ctx.input.paymentMethods !== undefined)
      checkout.paymentMethods = ctx.input.paymentMethods;
    if (ctx.input.expirationMinutes !== undefined)
      checkout.expirationMinutes = ctx.input.expirationMinutes;

    let invoice = await client.createInvoice(ctx.input.storeId, {
      amount: ctx.input.amountExact ?? ctx.input.amount,
      currency: ctx.input.currency,
      orderId: ctx.input.orderId,
      buyerEmail: ctx.input.buyerEmail,
      metadata: ctx.input.metadata,
      checkout: Object.keys(checkout).length > 0 ? checkout : undefined
    });

    return {
      output: {
        invoiceId: invoice.id as string,
        status: invoice.status as string,
        amount: providerAmount(invoice.amount, 'invoice.amount'),
        amountExact: typeof invoice.amount === 'string' ? invoice.amount : undefined,
        raw: invoice,
        currency: invoice.currency as string | undefined,
        checkoutLink: invoice.checkoutLink as string | undefined,
        createdTime:
          invoice.createdTime !== undefined ? String(invoice.createdTime) : undefined,
        expirationTime:
          invoice.expirationTime !== undefined ? String(invoice.expirationTime) : undefined,
        metadata: invoice.metadata as Record<string, unknown> | undefined
      },
      message: `Created invoice **${invoice.id}** for ${invoice.amount ?? 'top-up'} ${invoice.currency ?? ''} — status: **${invoice.status}**.`
    };
  })
  .build();
