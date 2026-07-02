import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let invoiceStatus = SlateTrigger.create(spec, {
  name: 'Invoice Status Update',
  key: 'invoice_status_update',
  description:
    'Triggered when an invoice status changes. Receives webhook callbacks from Plisio for events like payment received, completed, expired, or failed.'
})
  .input(
    z.object({
      transactionId: z.string().describe('Plisio transaction ID'),
      status: z.string().describe('Invoice status'),
      amount: z.string().optional().describe('Amount received'),
      currency: z.string().optional().describe('Cryptocurrency code'),
      orderName: z.string().optional().describe('Merchant order name'),
      orderNumber: z.string().optional().describe('Merchant order number'),
      sourceCurrency: z.string().optional().describe('Fiat currency code'),
      sourceAmount: z.string().optional().describe('Fiat amount'),
      sourceRate: z.string().optional().describe('Exchange rate'),
      pendingAmount: z.string().optional().describe('Remaining unconfirmed amount'),
      walletHash: z.string().optional().describe('Payment wallet address'),
      confirmations: z.number().optional().describe('Number of confirmations'),
      invoiceCommission: z.string().optional().describe('Plisio commission'),
      invoiceSum: z.string().optional().describe('Invoice amount excluding commission'),
      invoiceTotalSum: z.string().optional().describe('Total invoice amount'),
      txUrls: z.string().optional().describe('Block explorer URL(s)'),
      merchant: z.string().optional().describe('Merchant name'),
      merchantId: z.string().optional().describe('Merchant identifier'),
      expireUtc: z.string().optional().describe('Expiration timestamp'),
      comment: z.string().optional().describe('Additional comment')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Plisio transaction ID'),
      status: z
        .string()
        .describe('Invoice status (new, pending, completed, expired, error, cancelled)'),
      amount: z.string().optional().describe('Amount received in cryptocurrency'),
      currency: z.string().optional().describe('Cryptocurrency code'),
      orderName: z.string().optional().describe('Merchant order name'),
      orderNumber: z.string().optional().describe('Merchant order number'),
      sourceCurrency: z.string().optional().describe('Fiat currency code'),
      sourceAmount: z.string().optional().describe('Original fiat amount'),
      sourceRate: z.string().optional().describe('Exchange rate used'),
      pendingAmount: z.string().optional().describe('Remaining unconfirmed amount'),
      walletHash: z.string().optional().describe('Payment wallet address'),
      confirmations: z.number().optional().describe('Number of blockchain confirmations'),
      invoiceCommission: z.string().optional().describe('Plisio service commission'),
      invoiceSum: z.string().optional().describe('Invoice amount excluding commission'),
      invoiceTotalSum: z.string().optional().describe('Total invoice amount'),
      txUrls: z.string().optional().describe('Block explorer URL(s)'),
      merchant: z.string().optional().describe('Merchant name'),
      merchantId: z.string().optional().describe('Merchant identifier'),
      expireUtc: z.string().optional().describe('Expiration timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;

      let contentType = ctx.request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else {
        // Handle form-encoded data
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      }

      if (!data?.txn_id) {
        return { inputs: [] };
      }

      let confirmations: number | undefined;
      if (data.confirmations !== undefined && data.confirmations !== null) {
        confirmations = Number(data.confirmations);
        if (Number.isNaN(confirmations)) {
          confirmations = undefined;
        }
      }

      return {
        inputs: [
          {
            transactionId: data.txn_id,
            status: data.status || 'new',
            amount: data.amount,
            currency: data.currency ?? data.psys_cid,
            orderName: data.order_name,
            orderNumber: data.order_number,
            sourceCurrency: data.source_currency,
            sourceAmount: data.source_amount,
            sourceRate: data.source_rate,
            pendingAmount: data.pending_amount,
            walletHash: data.wallet_hash,
            confirmations,
            invoiceCommission: data.invoice_commission,
            invoiceSum: data.invoice_sum,
            invoiceTotalSum: data.invoice_total_sum,
            txUrls: data.tx_urls,
            merchant: data.merchant,
            merchantId: data.merchant_id,
            expireUtc: data.expire_utc !== undefined ? String(data.expire_utc) : undefined,
            comment: data.comment
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: `invoice.${input.status.replace(/\s+/g, '_')}`,
        id: `${input.transactionId}_${input.status}_${input.confirmations ?? 0}`,
        output: {
          transactionId: input.transactionId,
          status: input.status,
          amount: input.amount,
          currency: input.currency,
          orderName: input.orderName,
          orderNumber: input.orderNumber,
          sourceCurrency: input.sourceCurrency,
          sourceAmount: input.sourceAmount,
          sourceRate: input.sourceRate,
          pendingAmount: input.pendingAmount,
          walletHash: input.walletHash,
          confirmations: input.confirmations,
          invoiceCommission: input.invoiceCommission,
          invoiceSum: input.invoiceSum,
          invoiceTotalSum: input.invoiceTotalSum,
          txUrls: input.txUrls,
          merchant: input.merchant,
          merchantId: input.merchantId,
          expireUtc: input.expireUtc
        }
      };
    }
  })
  .build();
