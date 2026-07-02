import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let confirmCheckoutTool = SlateTool.create(spec, {
  name: 'Confirm Checkout',
  key: 'confirm_checkout',
  description: `Finalize an order by confirming the checkout with payment status. This is the final step of the checkout flow after "Fill Order". Optionally send a confirmation email to the buyer.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('The event ID'),
      eventDateId: z.number().describe('The event date ID'),
      checkoutId: z.number().describe('The checkout ID'),
      paymentStatus: z.string().describe('Payment status (e.g., "success")'),
      comments: z.string().describe('Comments for the order'),
      sendEmail: z
        .boolean()
        .optional()
        .describe('Whether to send confirmation email (default: true)')
    })
  )
  .output(
    z.object({
      checkoutId: z.number().describe('Checkout ID'),
      transactionRef: z.string().optional().describe('Transaction reference'),
      transactionTotal: z.number().optional().describe('Total amount'),
      transactionTax: z.number().optional().describe('Tax amount'),
      transactionDiscount: z.number().optional().describe('Discount amount'),
      eventzillaFee: z.number().optional().describe('Service fee'),
      transactionStatus: z.string().optional().describe('Final transaction status'),
      confirmationEmailSent: z
        .boolean()
        .optional()
        .describe('Whether confirmation email was sent'),
      currency: z.string().optional().describe('Currency symbol')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.confirmCheckout({
      eventId: ctx.input.eventId,
      eventDateId: ctx.input.eventDateId,
      checkoutId: ctx.input.checkoutId,
      paymentStatus: ctx.input.paymentStatus,
      comments: ctx.input.comments,
      sendEmail: ctx.input.sendEmail
    });

    return {
      output: {
        checkoutId: data.checkout_id,
        transactionRef: data.transaction_ref,
        transactionTotal: data.transaction_total,
        transactionTax: data.transaction_tax,
        transactionDiscount: data.transaction_discount,
        eventzillaFee: data.eventzilla_fee,
        transactionStatus: data.transaction_status,
        confirmationEmailSent: data.confirmation_email_sent,
        currency: data.currency
      },
      message: `Checkout **${data.checkout_id}** confirmed. Status: ${data.transaction_status}. Total: ${data.currency}${data.transaction_total}.`
    };
  })
  .build();
