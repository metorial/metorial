import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let fillOrderTool = SlateTool.create(spec, {
  name: 'Fill Order',
  key: 'fill_order',
  description: `Submit buyer details, attendee information, and answers to custom registration questions for an existing checkout session. This is the second step in the checkout flow after "Create Checkout" and before "Confirm Checkout".`,
  instructions: [
    'Use ticket price IDs from the "Create Checkout" response.',
    'Question IDs come from the "Prepare Checkout" response.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('The event ID'),
      eventDateId: z.number().describe('The event date ID'),
      checkoutId: z.number().describe('The checkout ID from "Create Checkout"'),
      buyerFirstName: z.string().describe('Buyer first name'),
      buyerLastName: z.string().describe('Buyer last name'),
      buyerEmail: z.string().describe('Buyer email address'),
      tickets: z
        .array(
          z.object({
            ticketPriceId: z.number().describe('Ticket price ID from checkout'),
            firstName: z.string().describe('Attendee first name'),
            lastName: z.string().describe('Attendee last name'),
            email: z.string().describe('Attendee email'),
            answers: z
              .array(
                z.object({
                  questionId: z.number().describe('Question ID'),
                  answerText: z.string().describe('Answer text')
                })
              )
              .optional()
              .describe('Answers to custom registration questions')
          })
        )
        .describe('Attendee details for each ticket'),
      paymentId: z.number().describe('Payment option ID from "Prepare Checkout"')
    })
  )
  .output(
    z.object({
      checkoutId: z.number().describe('Checkout ID'),
      transactionRef: z.string().optional().describe('Transaction reference'),
      transactionTotal: z.number().optional().describe('Total amount'),
      transactionTax: z.number().optional().describe('Tax amount'),
      transactionDiscount: z.number().optional().describe('Discount amount'),
      transactionStatus: z.string().optional().describe('Transaction status'),
      eventzillaFee: z.number().optional().describe('Service fee'),
      currency: z.string().optional().describe('Currency symbol')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.fillOrder({
      eventId: ctx.input.eventId,
      eventDateId: ctx.input.eventDateId,
      checkoutId: ctx.input.checkoutId,
      buyerDetails: {
        firstName: ctx.input.buyerFirstName,
        lastName: ctx.input.buyerLastName,
        email: ctx.input.buyerEmail
      },
      tickets: ctx.input.tickets,
      paymentId: ctx.input.paymentId
    });

    return {
      output: {
        checkoutId: data.checkout_id,
        transactionRef: data.transaction_ref,
        transactionTotal: data.transaction_total,
        transactionTax: data.transaction_tax,
        transactionDiscount: data.transaction_discount,
        transactionStatus: data.transaction_status,
        eventzillaFee: data.eventzilla_fee,
        currency: data.currency
      },
      message: `Order filled for checkout **${data.checkout_id}**. Status: ${data.transaction_status}. Use "Confirm Checkout" to finalize.`
    };
  })
  .build();
