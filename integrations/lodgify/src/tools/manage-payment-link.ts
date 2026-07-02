import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePaymentLink = SlateTool.create(spec, {
  name: 'Manage Payment Link',
  key: 'manage_payment_link',
  description: `Get or create a payment link for a booking. Payment links allow guests to pay for their reservation online. You can retrieve an existing payment link or create a new one for a booking.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('The booking ID to manage the payment link for'),
      action: z
        .enum(['get', 'create'])
        .describe('Whether to retrieve an existing payment link or create a new one'),
      amount: z.number().optional().describe('Payment amount (for creating a new link)'),
      currency: z
        .string()
        .optional()
        .describe('Currency code, e.g. "USD" (for creating a new link)'),
      description: z
        .string()
        .optional()
        .describe('Description for the payment (for creating a new link)')
    })
  )
  .output(
    z.object({
      paymentLink: z.any().describe('Payment link details including URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let paymentLink: any;
    if (ctx.input.action === 'create') {
      paymentLink = await client.createPaymentLink(ctx.input.bookingId, {
        amount: ctx.input.amount,
        currency: ctx.input.currency,
        description: ctx.input.description
      });

      return {
        output: { paymentLink },
        message: `Created payment link for booking **#${ctx.input.bookingId}**.`
      };
    }

    paymentLink = await client.getPaymentLink(ctx.input.bookingId);

    return {
      output: { paymentLink },
      message: `Retrieved payment link for booking **#${ctx.input.bookingId}**.`
    };
  })
  .build();
