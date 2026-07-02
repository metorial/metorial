import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCheckoutTool = SlateTool.create(spec, {
  name: 'Create Checkout',
  key: 'create_checkout',
  description: `Initiate a new checkout session for an event by selecting ticket types and quantities. Optionally apply a discount code. Returns a checkout ID and transaction summary needed for the next steps (fill order, then confirm checkout).`,
  instructions: [
    'Use "Prepare Checkout" first to get available ticket type IDs.',
    'After creating, use "Fill Order" to submit buyer and attendee details, then "Confirm Checkout" to finalize.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('The event ID'),
      eventDateId: z.number().describe('The event date ID'),
      ticketTypes: z
        .array(
          z.object({
            ticketTypeId: z.number().describe('Ticket type ID'),
            quantity: z.number().describe('Number of tickets')
          })
        )
        .describe('Ticket types and quantities to purchase'),
      discountCode: z.string().optional().describe('Optional discount/promo code')
    })
  )
  .output(
    z.object({
      checkoutId: z.number().describe('Checkout session ID'),
      transactionRef: z.string().optional().describe('Transaction reference number'),
      transactionTotal: z.number().optional().describe('Total transaction amount'),
      transactionTax: z.number().optional().describe('Tax amount'),
      transactionDiscount: z.number().optional().describe('Discount amount'),
      eventzillaFee: z.number().optional().describe('Eventzilla service fee'),
      currency: z.string().optional().describe('Currency symbol'),
      tickets: z
        .array(
          z.object({
            ticketPriceId: z
              .number()
              .optional()
              .describe('Ticket price ID (use in fill order)'),
            ticketTypeId: z.number().optional().describe('Ticket type ID'),
            ticketTypeName: z.string().optional().describe('Ticket type name')
          })
        )
        .optional()
        .describe('Tickets in the checkout')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.createCheckout({
      eventId: ctx.input.eventId,
      eventDateId: ctx.input.eventDateId,
      ticketTypes: ctx.input.ticketTypes,
      discountCode: ctx.input.discountCode
    });

    let tickets = data.tickets?.map((t: any) => ({
      ticketPriceId: t.ticket_price_id,
      ticketTypeId: t.ticket_type_id,
      ticketTypeName: t.ticket_type_name
    }));

    return {
      output: {
        checkoutId: data.checkout_id,
        transactionRef: data.transaction_ref,
        transactionTotal: data.transaction_total,
        transactionTax: data.transaction_tax,
        transactionDiscount: data.transaction_discount,
        eventzillaFee: data.eventzilla_fee,
        currency: data.currency,
        tickets
      },
      message: `Checkout **${data.checkout_id}** created. Total: ${data.currency}${data.transaction_total}. Use "Fill Order" next.`
    };
  })
  .build();
