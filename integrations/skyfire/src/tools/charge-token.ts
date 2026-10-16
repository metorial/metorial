import { SlateTool } from 'slates';
import { z } from 'zod';
import { SkyfireClient } from '../lib/client';
import { spec } from '../spec';

export let chargeToken = SlateTool.create(spec, {
  name: 'Charge Token',
  key: 'charge_token',
  description: `Charge a buyer's PAY or KYA+PAY token as a seller to collect payment for services rendered. The charge amount must be less than or equal to the token's authorized maximum amount.`,
  instructions: [
    'Requires a seller API key for authentication.',
    'chargeAmount is required unless the seller service uses PAY_PER_USE pricing; when omitted for that model, Skyfire charges the configured service price.',
    'Charge only after providing the service. Tokens support partial charges up to the remaining balance; do not retry an uncertain payment result automatically.',
    'Settlement is asynchronous. The response confirms the charge, not final settlement.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      buyerToken: z.string().describe('The signed JWT token received from the buyer agent'),
      chargeAmount: z
        .string()
        .optional()
        .describe('Amount to charge from the token in USD as a decimal string')
    })
  )
  .output(
    z.object({
      amountCharged: z.string().describe('The amount that was charged in USD'),
      remainingBalance: z
        .string()
        .describe('The remaining balance on the token after the charge'),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SkyfireClient({ token: ctx.auth.token });

    let result = await client.chargeToken({
      token: ctx.input.buyerToken,
      chargeAmount: ctx.input.chargeAmount
    });

    return {
      output: { ...result, raw: result },
      message: `Charged **$${result.amountCharged}** from buyer token. Remaining balance: **$${result.remainingBalance}**.`
    };
  })
  .build();
