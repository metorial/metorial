import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeGraphQLClient } from '../lib/client';
import { AUTHORIZE_PAYMENT_METHOD, CHARGE_PAYMENT_METHOD } from '../lib/graphql-queries';
import { spec } from '../spec';

let transactionOutputSchema = z.object({
  transactionId: z.string().describe('GraphQL ID of the transaction'),
  legacyId: z.string().describe('Legacy transaction ID'),
  status: z.string().describe('Transaction status'),
  amount: z.string().describe('Transaction amount'),
  currencyCode: z.string().describe('Currency code'),
  merchantAccountId: z.string().optional().describe('Merchant account ID'),
  orderId: z.string().optional().nullable().describe('Order ID'),
  customerEmail: z.string().optional().nullable().describe('Customer email'),
  paymentMethodDetails: z.any().optional().describe('Payment method details'),
  createdAt: z.string().optional().describe('When the transaction was created')
});

export let createTransaction = SlateTool.create(spec, {
  name: 'Create Transaction',
  key: 'create_transaction',
  description: `Creates a payment transaction in Braintree. Supports both sale (immediate capture) and authorization-only flows.
Use this to charge a payment method or authorize an amount for later capture.
Requires a payment method ID (from the Braintree vault or a single-use nonce) and an amount.`,
  instructions: [
    'For immediate payment, use type "sale" (default). For authorize-then-capture workflows, use type "authorize".',
    'The paymentMethodId should be a Braintree GraphQL ID of a vaulted payment method or a single-use payment method ID.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      paymentMethodId: z.string().describe('Braintree payment method ID to charge'),
      amount: z.string().describe('Amount to charge (e.g. "10.00")'),
      currencyCode: z
        .string()
        .optional()
        .describe(
          'ISO 4217 currency code (e.g. "USD"). Defaults to merchant default currency.'
        ),
      type: z
        .enum(['sale', 'authorize'])
        .default('sale')
        .describe('Transaction type: "sale" for immediate capture, "authorize" for hold only'),
      orderId: z.string().optional().describe('Custom order ID for your records'),
      merchantAccountId: z
        .string()
        .optional()
        .describe('Specific merchant account ID to process this transaction'),
      customerId: z
        .string()
        .optional()
        .describe('Customer ID to associate with the transaction'),
      lineItems: z
        .array(
          z.object({
            name: z.string().describe('Line item name'),
            kind: z.enum(['DEBIT', 'CREDIT']).describe('Line item kind'),
            quantity: z.string().describe('Quantity'),
            unitAmount: z.string().describe('Unit amount'),
            totalAmount: z.string().describe('Total amount')
          })
        )
        .optional()
        .describe('Line items for Level 3 processing')
    })
  )
  .output(transactionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new BraintreeGraphQLClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let transactionInput: Record<string, any> = {
      paymentMethodId: ctx.input.paymentMethodId,
      amount: ctx.input.amount
    };

    if (ctx.input.orderId) transactionInput.orderId = ctx.input.orderId;
    if (ctx.input.merchantAccountId)
      transactionInput.merchantAccountId = ctx.input.merchantAccountId;
    if (ctx.input.customerId) transactionInput.customerId = ctx.input.customerId;

    let transaction: any;

    if (ctx.input.type === 'authorize') {
      let result = await client.query(AUTHORIZE_PAYMENT_METHOD, {
        input: { paymentMethodId: ctx.input.paymentMethodId, transaction: transactionInput }
      });
      transaction = result.authorizePaymentMethod.transaction;
    } else {
      let result = await client.query(CHARGE_PAYMENT_METHOD, {
        input: { paymentMethodId: ctx.input.paymentMethodId, transaction: transactionInput }
      });
      transaction = result.chargePaymentMethod.transaction;
    }

    let output = {
      transactionId: transaction.id,
      legacyId: transaction.legacyId,
      status: transaction.status,
      amount: transaction.amount?.value || ctx.input.amount,
      currencyCode: transaction.amount?.currencyCode || ctx.input.currencyCode || 'USD',
      merchantAccountId: transaction.merchantAccountId,
      orderId: transaction.orderId,
      customerEmail: transaction.customer?.email,
      paymentMethodDetails: transaction.paymentMethod?.details,
      createdAt: transaction.createdAt
    };

    return {
      output,
      message: `**${ctx.input.type === 'authorize' ? 'Authorized' : 'Charged'}** transaction \`${transaction.legacyId}\` for **${ctx.input.amount} ${output.currencyCode}** — status: **${transaction.status}**`
    };
  })
  .build();
