import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transactionSchema = z.object({
  transactionRef: z.string().optional().describe('Transaction reference number'),
  checkoutId: z.number().optional().describe('Checkout ID'),
  transactionDate: z.string().optional().describe('Transaction date'),
  transactionAmount: z.string().optional().describe('Transaction amount'),
  ticketsInTransaction: z.string().optional().describe('Number of tickets in transaction'),
  eventDate: z.string().optional().describe('Event date'),
  transactionStatus: z
    .string()
    .optional()
    .describe('Status: Confirmed, Pending, Cancelled, or Incomplete'),
  userId: z.number().optional().describe('User ID'),
  eventId: z.number().optional().describe('Event ID'),
  eventTitle: z.string().optional().describe('Event title'),
  email: z.string().optional().describe('Buyer email'),
  buyerFirstName: z.string().optional().describe('Buyer first name'),
  buyerLastName: z.string().optional().describe('Buyer last name'),
  promoCode: z.string().optional().describe('Discount/promo code used'),
  paymentType: z.string().optional().describe('Payment type'),
  comments: z.string().optional().describe('Order comments')
});

export let listTransactionsTool = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve all transactions for a specific event, including buyer info, amounts, status, payment type, and discount codes. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The event ID to get transactions for'),
      offset: z.number().optional().describe('Number of records to skip'),
      limit: z.number().optional().describe('Number of records per page')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionSchema).describe('List of transactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listEventTransactions(ctx.input.eventId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let rawTransactions = Array.isArray(data?.transactions)
      ? data.transactions
      : Array.isArray(data)
        ? data
        : [];

    let transactions = rawTransactions.map((t: any) => ({
      transactionRef: t.transaction_ref,
      checkoutId: t.checkout_id,
      transactionDate: t.transaction_date,
      transactionAmount: t.transaction_amount,
      ticketsInTransaction: t.tickets_in_transaction,
      eventDate: t.event_date,
      transactionStatus: t.transaction_status,
      userId: t.user_id,
      eventId: t.event_id,
      eventTitle: t.title,
      email: t.email,
      buyerFirstName: t.buyer_first_name,
      buyerLastName: t.buyer_last_name,
      promoCode: t.promo_code,
      paymentType: t.payment_type,
      comments: t.comments
    }));

    return {
      output: { transactions },
      message: `Found **${transactions.length}** transaction(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();
