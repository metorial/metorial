import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeRestClient } from '../lib/client';
import { parseXml } from '../lib/xml';
import { spec } from '../spec';

export let findTransaction = SlateTool.create(spec, {
  name: 'Find Transaction',
  key: 'find_transaction',
  description: `Retrieves details of a specific Braintree transaction by its ID. Returns full transaction information including status, amount, payment method, customer, and settlement details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('The Braintree transaction ID (legacy ID)')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      status: z.string().describe('Current transaction status'),
      type: z.string().describe('Transaction type (sale, credit, etc.)'),
      amount: z.string().describe('Transaction amount'),
      currencyIsoCode: z.string().optional().describe('Currency code'),
      merchantAccountId: z.string().optional().describe('Merchant account ID'),
      orderId: z.string().optional().nullable().describe('Order ID'),
      customer: z
        .object({
          customerId: z.string().optional().nullable(),
          firstName: z.string().optional().nullable(),
          lastName: z.string().optional().nullable(),
          email: z.string().optional().nullable(),
          company: z.string().optional().nullable()
        })
        .optional()
        .describe('Customer details'),
      paymentMethod: z
        .object({
          cardType: z.string().optional().nullable(),
          last4: z.string().optional().nullable(),
          expirationMonth: z.string().optional().nullable(),
          expirationYear: z.string().optional().nullable(),
          payerEmail: z.string().optional().nullable()
        })
        .optional()
        .describe('Payment method details'),
      createdAt: z.string().optional().describe('When the transaction was created'),
      updatedAt: z.string().optional().describe('When the transaction was last updated'),
      settlementBatchId: z.string().optional().nullable().describe('Settlement batch ID'),
      refundIds: z.array(z.string()).optional().describe('IDs of associated refunds')
    })
  )
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let xml = await rest.get(`/transactions/${ctx.input.transactionId}`);
    let parsed = parseXml(xml);
    let txn = parsed.transaction || parsed;

    let output = {
      transactionId: txn.id || ctx.input.transactionId,
      status: txn.status || '',
      type: txn.type || '',
      amount: txn.amount || '',
      currencyIsoCode: txn.currencyIsoCode,
      merchantAccountId: txn.merchantAccountId,
      orderId: txn.orderId,
      customer: txn.customer
        ? {
            customerId: txn.customer.id,
            firstName: txn.customer.firstName,
            lastName: txn.customer.lastName,
            email: txn.customer.email,
            company: txn.customer.company
          }
        : undefined,
      paymentMethod: txn.creditCard
        ? {
            cardType: txn.creditCard.cardType,
            last4: txn.creditCard.last4,
            expirationMonth: txn.creditCard.expirationMonth,
            expirationYear: txn.creditCard.expirationYear,
            payerEmail: null
          }
        : txn.paypal
          ? {
              cardType: null,
              last4: null,
              expirationMonth: null,
              expirationYear: null,
              payerEmail: txn.paypal.payerEmail
            }
          : undefined,
      createdAt: txn.createdAt,
      updatedAt: txn.updatedAt,
      settlementBatchId: txn.settlementBatchId,
      refundIds: txn.refundIds || txn.refundId ? [txn.refundId] : []
    };

    return {
      output,
      message: `Transaction \`${output.transactionId}\` — **${output.status}** — **${output.amount} ${output.currencyIsoCode || ''}** (${output.type})`
    };
  })
  .build();
