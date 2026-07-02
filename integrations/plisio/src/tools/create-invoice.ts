import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { spec } from '../spec';

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a cryptocurrency payment invoice for a customer. Supports pricing in crypto directly or in fiat currency with automatic conversion. Can restrict which cryptocurrencies are accepted and configure expiration, callback URLs, and redirect behavior.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      currency: z
        .string()
        .optional()
        .describe('Cryptocurrency ID (e.g. BTC, ETH, LTC). Auto-selected if omitted.'),
      orderName: z.string().describe('Merchant order name'),
      orderNumber: z.string().describe('Unique merchant order number'),
      amount: z
        .number()
        .optional()
        .describe(
          'Amount in cryptocurrency. Omit if using fiat conversion with sourceCurrency and sourceAmount.'
        ),
      sourceCurrency: z
        .string()
        .optional()
        .describe('Fiat currency code for automatic conversion (e.g. USD, EUR)'),
      sourceAmount: z
        .number()
        .optional()
        .describe('Amount in fiat currency to convert to crypto'),
      allowedCryptocurrencies: z
        .string()
        .optional()
        .describe('Comma-separated list of allowed cryptocurrency IDs (e.g. BTC,ETH,LTC)'),
      description: z.string().optional().describe('Invoice description shown to the customer'),
      callbackUrl: z
        .string()
        .optional()
        .describe(
          'URL to receive invoice status updates via POST. Append ?json=true for JSON format.'
        ),
      successCallbackUrl: z
        .string()
        .optional()
        .describe('URL for successful payment callback'),
      failCallbackUrl: z.string().optional().describe('URL for failed payment callback'),
      successInvoiceUrl: z
        .string()
        .optional()
        .describe('Button link on invoice page after successful payment'),
      failInvoiceUrl: z
        .string()
        .optional()
        .describe('Button link on invoice page after failed payment'),
      email: z.string().optional().describe('Pre-filled customer email'),
      expireMin: z.number().optional().describe('Invoice expiration time in minutes')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Plisio transaction ID for the invoice'),
      invoiceUrl: z.string().describe('URL to the hosted Plisio invoice page'),
      invoiceTotalSum: z
        .string()
        .optional()
        .describe('Total invoice amount in cryptocurrency'),
      amount: z.string().optional().describe('Invoice amount'),
      pendingAmount: z.string().optional().describe('Remaining unconfirmed amount'),
      walletHash: z.string().optional().describe('Payment wallet address'),
      currency: z.string().optional().describe('Cryptocurrency code'),
      status: z.string().optional().describe('Current invoice status'),
      sourceCurrency: z.string().optional().describe('Fiat currency code'),
      sourceRate: z.string().optional().describe('Exchange rate used for conversion'),
      expireUtc: z.number().optional().describe('Expiration timestamp (UTC)'),
      qrCode: z.string().optional().describe('Base64-encoded QR code image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = await client.createInvoice({
      currency: ctx.input.currency,
      orderName: ctx.input.orderName,
      orderNumber: ctx.input.orderNumber,
      amount: ctx.input.amount,
      sourceCurrency: ctx.input.sourceCurrency,
      sourceAmount: ctx.input.sourceAmount,
      allowedPsysCids: ctx.input.allowedCryptocurrencies,
      description: ctx.input.description,
      callbackUrl: ctx.input.callbackUrl,
      successCallbackUrl: ctx.input.successCallbackUrl,
      failCallbackUrl: ctx.input.failCallbackUrl,
      successInvoiceUrl: ctx.input.successInvoiceUrl,
      failInvoiceUrl: ctx.input.failInvoiceUrl,
      email: ctx.input.email,
      expireMin: ctx.input.expireMin
    });

    return {
      output: {
        transactionId: result.txn_id,
        invoiceUrl: result.invoice_url,
        invoiceTotalSum: result.invoice_total_sum,
        amount: result.amount,
        pendingAmount: result.pending_amount,
        walletHash: result.wallet_hash,
        currency: result.currency ?? result.psys_cid,
        status: result.status,
        sourceCurrency: result.source_currency,
        sourceRate: result.source_rate,
        expireUtc: result.expire_utc,
        qrCode: result.qr_code
      },
      message: `Invoice **${ctx.input.orderName}** (order #${ctx.input.orderNumber}) created successfully. Transaction ID: \`${result.txn_id}\`. [View invoice](${result.invoice_url})`
    };
  })
  .build();
