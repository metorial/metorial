import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

export let refundInvoice = SlateTool.create(spec, {
  name: 'Refund Invoice',
  key: 'refund_invoice',
  description: `Issue a full or partial refund for a settled invoice. Returns a link where the customer can claim the refund. Supports different refund variants including original payment method, fiat, and custom amounts.`,
  instructions: [
    'The invoice must be in "Settled" status to be refunded.',
    'The refund link should be shared with the customer so they can claim their refund.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      storeId: z.string().describe('Store ID'),
      invoiceId: z.string().describe('Invoice ID to refund'),
      refundVariant: z
        .enum(['RateThen', 'CurrentRate', 'Fiat', 'OverpaidAmount', 'Custom'])
        .optional()
        .describe(
          'Refund calculation method. RateThen = use original rate, CurrentRate = current exchange rate, Fiat = refund in fiat, Custom = specify a custom amount.'
        ),
      paymentMethod: z
        .string()
        .optional()
        .describe('Payment method for the refund (e.g., BTC, BTC-LightningNetwork)'),
      name: z.string().optional().describe('Refund name/label'),
      description: z.string().optional().describe('Refund description'),
      subtractPercentage: z
        .number()
        .optional()
        .describe('Percentage to subtract from the refund (0-100)'),
      customAmount: z
        .number()
        .optional()
        .describe('Custom refund amount (when refundVariant is Custom)'),
      customCurrency: z
        .string()
        .optional()
        .describe('Currency for custom amount (when refundVariant is Custom)')
    })
  )
  .output(
    z.object({
      refundLink: z
        .string()
        .optional()
        .describe('URL where the customer can claim the refund'),
      pullPaymentId: z.string().optional().describe('Pull payment ID created for the refund')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.refundInvoice(ctx.input.storeId, ctx.input.invoiceId, {
      refundVariant: ctx.input.refundVariant,
      paymentMethod: ctx.input.paymentMethod,
      name: ctx.input.name,
      description: ctx.input.description,
      subtractPercentage: ctx.input.subtractPercentage,
      customAmount: ctx.input.customAmount,
      customCurrency: ctx.input.customCurrency
    });

    return {
      output: {
        refundLink: result.viewLink as string | undefined,
        pullPaymentId: result.id as string | undefined
      },
      message: `Refund created for invoice **${ctx.input.invoiceId}**. Customer refund link: ${result.viewLink ?? 'N/A'}.`
    };
  })
  .build();
