import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let confirmPoeTool = SlateTool.create(spec, {
  name: 'Confirm Proof of Entry',
  key: 'confirm_poe',
  description: `Validate that an email verification performed by the NeverBounce JavaScript Widget has not been tampered with. Confirms the email, result, transaction ID, and confirmation token match the original widget verification. Use this for server-side validation of client-side widget results.`,
  instructions: [
    'The transaction ID and confirmation token are provided by the widget as nb-transaction-id and nb-confirmation-token form fields.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address that was verified by the widget'),
      verificationResult: z
        .string()
        .describe('The verification result returned by the widget (e.g., valid, invalid)'),
      transactionId: z
        .string()
        .describe('The transaction ID from the widget (nb-transaction-id)'),
      confirmationToken: z
        .string()
        .describe('The confirmation token from the widget (nb-confirmation-token)')
    })
  )
  .output(
    z.object({
      tokenConfirmed: z
        .boolean()
        .describe('Whether the verification token is confirmed as authentic')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.poeConfirm({
      email: ctx.input.email,
      result: ctx.input.verificationResult,
      transactionId: ctx.input.transactionId,
      confirmationToken: ctx.input.confirmationToken
    });

    return {
      output: {
        tokenConfirmed: result.tokenConfirmed
      },
      message: result.tokenConfirmed
        ? `Proof of entry **confirmed** for **${ctx.input.email}**. The widget verification is authentic.`
        : `Proof of entry **not confirmed** for **${ctx.input.email}**. The verification may have been tampered with.`
    };
  })
  .build();
