import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let recordPayment = SlateTool.create(spec, {
  name: 'Record Payment',
  key: 'record_payment',
  description: `Records a payment against a reservation. Specify the payment method, status, amount, and a unique transaction identifier.

**Payment modes**: 2=Cash, 3=Cheque, 4=Bank transfer, 5=Other, 6=Gift certificate, 9=Discount, 10=Credit card on file, 1=PayPal.
**Payment statuses**: 1=Successful, 2=Pending, 3=Error, 4=Refund.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      reservationId: z.string().describe('ID of the reservation to apply payment to'),
      paymentMode: z
        .number()
        .describe(
          'Payment method code (2=Cash, 3=Cheque, 4=Bank transfer, 5=Other, 1=PayPal, etc.)'
        ),
      paymentStatus: z
        .number()
        .describe('Payment status (1=Successful, 2=Pending, 3=Error, 4=Refund)'),
      transactionId: z.string().describe('Unique payment/transaction identifier'),
      amount: z.number().describe('Payment amount'),
      currency: z.string().describe('ISO 4217 currency code (e.g. USD, EUR)'),
      paymentTime: z.string().optional().describe('Custom payment timestamp'),
      extraInfo: z.string().optional().describe('Additional payment metadata'),
      suppressNotifications: z.boolean().optional().describe('Suppress payment notifications')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('ID of the recorded payment'),
      reservationStatus: z.string().optional().describe('Reservation status after payment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.addReservationPayment({
      reservationId: ctx.input.reservationId,
      paymentMode: ctx.input.paymentMode,
      paymentStatus: ctx.input.paymentStatus,
      transactionId: ctx.input.transactionId,
      amount: ctx.input.amount,
      currency: ctx.input.currency,
      paymentTime: ctx.input.paymentTime,
      extraInfo: ctx.input.extraInfo,
      isQuiet: ctx.input.suppressNotifications
    });

    return {
      output: {
        paymentId: String(result.payment_id),
        reservationStatus: result.status ? String(result.status) : undefined
      },
      message: `Payment of **${ctx.input.currency} ${ctx.input.amount}** recorded for reservation #${ctx.input.reservationId} (payment #${result.payment_id}).`
    };
  })
  .build();
