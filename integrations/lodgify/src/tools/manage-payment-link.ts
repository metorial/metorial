import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePaymentLink = SlateTool.create(spec, {
  name: 'Manage Payment Link',
  key: 'manage_payment_link',
  description: `Get or create a payment link for a booking. Payment links allow guests to pay for their reservation online. You can retrieve the next payment link for a booking or create a new one for a specific amount.`,
  instructions: [
    'Creating a link requires an amount of at least 0.01. The currency is taken from the booking and cannot be chosen.',
    'Creating a link can be refused when the amount conflicts with the payment schedule already set on the booking.'
  ],
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
      amount: z
        .number()
        .optional()
        .describe(
          'Payment amount to request, at least 0.01 (required when creating a new link). The currency is the one already set on the booking'
        ),
      currency: z
        .string()
        .optional()
        .describe(
          'Not accepted: Lodgify derives the currency from the booking itself. Passing a value here returns an error'
        ),
      description: z
        .string()
        .optional()
        .describe(
          'Not accepted: Lodgify payment links carry no description. Passing a value here returns an error'
        )
    })
  )
  .output(
    z.object({
      paymentLink: z
        .any()
        .describe('Payment link details for the booking, including the payment page URL'),
      url: z
        .string()
        .optional()
        .describe(
          'The payment page URL where the guest can complete the payment, when a link is available'
        ),
      succeeded: z
        .boolean()
        .optional()
        .describe(
          'Whether Lodgify accepted the requested amount and created the link (create action only)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.currency || ctx.input.description) {
      throw createApiServiceError(
        'Lodgify payment links accept only an amount. The currency is derived from the booking and no payment description is supported, so currency and description cannot be sent. Remove them and retry.'
      );
    }

    let paymentLink: any;
    if (ctx.input.action === 'create') {
      if (ctx.input.amount === undefined) {
        throw createApiServiceError(
          'amount is required when creating a payment link. Provide the amount to request from the guest.'
        );
      }

      if (ctx.input.amount < 0.01) {
        throw createApiServiceError(
          `amount must be at least 0.01 to create a payment link, but got ${ctx.input.amount}.`
        );
      }

      let created = await client.createPaymentLink(ctx.input.bookingId, {
        amount: ctx.input.amount
      });
      let succeeded = typeof created?.succeeded === 'boolean' ? created.succeeded : undefined;

      if (succeeded === false) {
        throw createApiServiceError(
          `Lodgify refused to create a payment link for ${ctx.input.amount} on booking #${ctx.input.bookingId}. This happens when the requested amount cannot be enforced, typically because the booking already has a pending scheduled payment. Review the booking's payment schedule and retry with an amount that matches the next payment due.`
        );
      }

      // The create endpoint answers with `{ succeeded }` only, so the link itself has
      // to be read back to return something the guest can actually use.
      paymentLink = await client.getPaymentLink(ctx.input.bookingId);

      let createdUrl = typeof paymentLink?.url === 'string' ? paymentLink.url : undefined;
      let pending = createdUrl
        ? ''
        : ' The link URL is not available yet; retrieve it again with the get action.';

      return {
        output: { paymentLink, url: createdUrl, succeeded },
        message: `Created a payment link for **${ctx.input.amount}** on booking **#${ctx.input.bookingId}**.${pending}`
      };
    }

    paymentLink = await client.getPaymentLink(ctx.input.bookingId);

    let url = typeof paymentLink?.url === 'string' ? paymentLink.url : undefined;

    return {
      output: { paymentLink, url },
      message: url
        ? `Retrieved payment link for booking **#${ctx.input.bookingId}**.`
        : `No payment link is currently available for booking **#${ctx.input.bookingId}**.`
    };
  })
  .build();
