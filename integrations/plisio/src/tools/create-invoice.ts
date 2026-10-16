import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { optionalValue, readRecord, requireText, validateOutput } from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
  transactionId: z.string().describe('Plisio transaction ID for the invoice'),
  invoiceUrl: z.string().describe('URL to the hosted Plisio invoice page'),
  invoiceTotalSum: z.string().optional().describe('Total invoice amount in cryptocurrency'),
  amount: z.string().optional().describe('Invoice amount'),
  pendingAmount: z.string().optional().describe('Remaining unconfirmed amount'),
  walletHash: z.string().optional().describe('Payment wallet address'),
  currency: z.string().optional().describe('Cryptocurrency code'),
  status: z.string().optional().describe('Current invoice status'),
  sourceCurrency: z.string().optional().describe('Fiat currency code'),
  sourceRate: z.string().optional().describe('Exchange rate used for conversion'),
  expireUtc: z.number().optional().describe('Expiration timestamp (UTC)'),
  qrCode: z.string().optional().describe('Base64-encoded QR code image'),
  raw: z.unknown().describe('Original provider response with credentials removed')
});

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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    requireText(ctx.input.orderName, 'Order name');
    requireText(ctx.input.orderNumber, 'Order number');
    if (ctx.input.currency !== undefined) requireText(ctx.input.currency, 'Currency');
    let hasFiat =
      ctx.input.sourceCurrency !== undefined || ctx.input.sourceAmount !== undefined;
    if (
      (ctx.input.amount !== undefined && hasFiat) ||
      (hasFiat &&
        (ctx.input.sourceCurrency === undefined || ctx.input.sourceAmount === undefined)) ||
      (ctx.input.amount !== undefined &&
        (!Number.isFinite(ctx.input.amount) || ctx.input.amount <= 0)) ||
      (ctx.input.sourceAmount !== undefined &&
        (!Number.isFinite(ctx.input.sourceAmount) || ctx.input.sourceAmount <= 0))
    )
      throw createApiServiceError(
        'Use a positive cryptocurrency amount, or both a fiat source currency and a positive source amount. Do not combine the two pricing methods.'
      );
    if (ctx.input.sourceCurrency !== undefined)
      requireText(ctx.input.sourceCurrency, 'Source currency');
    if (
      ctx.input.expireMin !== undefined &&
      (!Number.isFinite(ctx.input.expireMin) || ctx.input.expireMin <= 0)
    ) {
      throw createApiServiceError('Expiration in minutes must be positive.');
    }
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = readRecord(
      await client.createInvoice({
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
      })
    );

    let output = validateOutput(outputSchema, {
      transactionId: result.txn_id,
      invoiceUrl: result.invoice_url,
      invoiceTotalSum: optionalValue(result.invoice_total_sum),
      amount: optionalValue(result.amount),
      pendingAmount: optionalValue(result.pending_amount),
      walletHash: optionalValue(result.wallet_hash),
      currency: result.currency ?? result.psys_cid,
      status: optionalValue(result.status),
      sourceCurrency: optionalValue(result.source_currency),
      sourceRate: optionalValue(result.source_rate),
      expireUtc: optionalValue(result.expire_utc),
      qrCode: optionalValue(result.qr_code),
      raw: result
    });

    let deliveryWarning = '';
    if (output.qrCode !== undefined) {
      let encoded = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(output.qrCode);
      let bytes = encoded?.[1] ? Buffer.from(encoded[1], 'base64') : undefined;
      if (
        bytes &&
        bytes.length >= 57 &&
        bytes.toString('base64').replace(/=+$/, '') === encoded?.[1]?.replace(/=+$/, '') &&
        bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        bytes.readUInt32BE(8) === 13 &&
        bytes.toString('ascii', 12, 16) === 'IHDR' &&
        bytes.readUInt32BE(16) > 0 &&
        bytes.readUInt32BE(20) > 0 &&
        bytes.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'))
      ) {
        try {
          await ctx.addAttachment({
            type: 'content',
            content: bytes,
            mimeType: 'image/png',
            filename: 'payment-qr.png'
          });
        } catch {
          deliveryWarning =
            ' The invoice was created, but its QR image could not be prepared for download. Use the invoice page; do not create the invoice again.';
        }
      } else {
        deliveryWarning =
          ' The invoice was created, but its QR image could not be validated for download. Use the invoice page; do not create the invoice again.';
      }
    }
    return {
      output,
      message: client.redact(
        `Invoice **${ctx.input.orderName}** (order #${ctx.input.orderNumber}) created successfully. Transaction ID: \`${output.transactionId}\`. [View invoice](${output.invoiceUrl})${deliveryWarning}`
      )
    };
  })
  .build();
