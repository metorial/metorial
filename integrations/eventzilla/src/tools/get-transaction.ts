import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTransactionTool = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description: `Look up a single transaction by checkout ID or order reference number. Returns detailed transaction data including tax, discount, and service fees.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionIdOrRef: z.string().describe('Checkout ID or order reference number')
    })
  )
  .output(
    z.object({
      transactionRef: z.string().optional().describe('Transaction reference number'),
      checkoutId: z.number().optional().describe('Checkout ID'),
      transactionDate: z.string().optional().describe('Transaction date'),
      transactionAmount: z.string().optional().describe('Transaction amount'),
      ticketsInTransaction: z.string().optional().describe('Number of tickets'),
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
      comments: z.string().optional().describe('Order comments'),
      transactionTax: z.string().optional().describe('Tax amount'),
      transactionDiscount: z.string().optional().describe('Discount amount'),
      eventzillaFee: z.string().optional().describe('Eventzilla service fee')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getTransaction(ctx.input.transactionIdOrRef);
    let t = Array.isArray(data?.transactions)
      ? data.transactions[0]
      : Array.isArray(data)
        ? data[0]
        : data;

    let output = {
      transactionRef: t.refno ?? t.transaction_ref,
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
      comments: t.comments,
      transactionTax: t.transaction_tax,
      transactionDiscount: t.transaction_discount,
      eventzillaFee: t.eventzilla_fee
    };

    return {
      output,
      message: `Retrieved transaction **${output.transactionRef}** (status: ${output.transactionStatus}, amount: ${output.transactionAmount}).`
    };
  })
  .build();
