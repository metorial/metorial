import { SlateTool } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let createCryptoInvoice = SlateTool.create(spec, {
  name: 'Create Crypto Invoice',
  key: 'create_crypto_invoice',
  description: `Create a cryptocurrency invoice or payment link. The invoice can be redirected to at checkout or hosted in an iFrame. Specify amounts in a local fiat currency (e.g., USD, EUR, CNY) while charging in a chosen cryptocurrency (e.g., BTC, LTC, DOGE, ETH).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      amount: z.string().describe('Invoice amount (e.g., "15")'),
      crypto: z
        .string()
        .describe('Cryptocurrency to charge in (e.g., "BTC", "LTC", "DOGE", "ETH")'),
      currency: z
        .string()
        .describe('Fiat currency for the amount (e.g., "USD", "EUR", "CNY")'),
      redirect: z.string().describe('URL to redirect customer after payment')
    })
  )
  .output(
    z.object({
      paymentLink: z.string().describe('URL to the invoice payment page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PoofClient({ token: ctx.auth.token });

    let result = await client.createCryptoInvoice({
      amount: ctx.input.amount,
      crypto: ctx.input.crypto,
      currency: ctx.input.currency,
      redirect: ctx.input.redirect
    });

    let paymentLink =
      result?.payment_link ||
      result?.paymentLink ||
      (typeof result === 'string' ? result : JSON.stringify(result));

    return {
      output: {
        paymentLink
      },
      message: `Crypto invoice created for **${ctx.input.amount} ${ctx.input.currency}** in **${ctx.input.crypto}**. Payment link: ${paymentLink}`
    };
  })
  .build();
