import { SlateTool } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let createPaymentLink = SlateTool.create(spec, {
  name: 'Create Payment Link',
  key: 'create_payment_link',
  description: `Create a cryptocurrency payment link (v2). Generates a shareable payment URL for the specified amount and cryptocurrency. Supports attaching custom metadata.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      amount: z.string().describe('Payment amount (e.g., "15")'),
      crypto: z.string().describe('Cryptocurrency (e.g., "ethereum", "bitcoin", "solana")'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata to attach')
    })
  )
  .output(
    z.object({
      paymentLink: z.string().describe('Generated payment link URL'),
      raw: z.any().optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PoofClient({ token: ctx.auth.token });

    let result = await client.createPaymentLink({
      amount: ctx.input.amount,
      crypto: ctx.input.crypto,
      metadata: ctx.input.metadata
    });

    let paymentLink =
      result?.payment_link ||
      result?.paymentLink ||
      (typeof result === 'string' ? result : JSON.stringify(result));

    return {
      output: {
        paymentLink,
        raw: result
      },
      message: `Payment link created for **${ctx.input.amount}** in **${ctx.input.crypto}**: ${paymentLink}`
    };
  })
  .build();
