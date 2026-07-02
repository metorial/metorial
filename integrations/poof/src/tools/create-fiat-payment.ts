import { SlateTool } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let createFiatPayment = SlateTool.create(spec, {
  name: 'Create Fiat Payment',
  key: 'create_fiat_payment',
  description: `Create a fiat payment through third-party gateways like PayPal, Cash App, Skrill, or Coinbase. Choose between an invoice (hosted payment page) or a direct charge (returns tracking ID and QR code).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z
        .enum(['invoice', 'charge'])
        .describe(
          'Payment type: "invoice" for hosted page or "charge" for direct charge with QR code'
        ),
      amount: z.string().describe('Payment amount (e.g., "15")'),
      paymentMethod: z
        .enum(['paypal', 'cashapp', 'skrill', 'coinbase'])
        .describe('Payment gateway to use'),
      currency: z.string().describe('Currency code (e.g., "usd")'),
      redirectUrl: z.string().describe('URL to redirect after payment'),
      successUrl: z.string().describe('URL for successful payment')
    })
  )
  .output(
    z.object({
      paymentLink: z.string().optional().describe('URL to the payment page'),
      trackingId: z.string().optional().describe('Tracking ID (for charges)'),
      qrCode: z.string().optional().describe('QR code URL (for charges)'),
      raw: z.any().optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PoofClient({ token: ctx.auth.token });

    let params = {
      amount: ctx.input.amount,
      payment: ctx.input.paymentMethod,
      currency: ctx.input.currency,
      redirectUrl: ctx.input.redirectUrl,
      successUrl: ctx.input.successUrl
    };

    let result =
      ctx.input.type === 'invoice'
        ? await client.createFiatInvoice(params)
        : await client.createFiatCharge(params);

    return {
      output: {
        paymentLink: result?.payment_link || result?.paymentLink,
        trackingId: result?.tracking_id,
        qrCode: result?.qr_code,
        raw: result
      },
      message: `Fiat ${ctx.input.type} created for **${ctx.input.amount} ${ctx.input.currency}** via **${ctx.input.paymentMethod}**.${result?.payment_link ? ` Payment link: ${result.payment_link}` : ''}`
    };
  })
  .build();
