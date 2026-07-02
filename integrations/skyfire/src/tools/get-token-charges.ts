import { SlateTool } from 'slates';
import { z } from 'zod';
import { SkyfireClient } from '../lib/client';
import { spec } from '../spec';

export let getTokenCharges = SlateTool.create(spec, {
  name: 'Get Token Charges',
  key: 'get_token_charges',
  description: `Retrieve all charges applied to a specific PAY or KYA+PAY token for auditing and reconciliation. Shows what was authorized versus what was actually charged, including settlement details.`,
  instructions: [
    'The tokenId is the jti claim value from the token JWT body, not the full JWT string.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tokenId: z.string().describe('The jti (JWT ID) claim value from the token body')
    })
  )
  .output(
    z.object({
      charges: z
        .array(
          z.object({
            audience: z.string().describe('Audience UUID (seller agent)'),
            value: z.string().describe('Charged amount in USD'),
            chargedAt: z.string().describe('ISO 8601 timestamp when the charge was made'),
            claimId: z.string().describe('UUID of the charge claim'),
            sellerServiceId: z.string().describe('UUID of the seller service that charged'),
            settledAt: z.string().describe('ISO 8601 timestamp when the charge was settled'),
            subject: z.string().describe('Subject UUID (buyer agent)'),
            tokenType: z.string().describe('Token type (pay or kya+pay)')
          })
        )
        .describe('List of charges applied to the token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SkyfireClient({ token: ctx.auth.token });

    let result = await client.getTokenCharges(ctx.input.tokenId);

    let totalCharged = result.charges.reduce((sum, c) => sum + Number.parseFloat(c.value), 0);

    return {
      output: result,
      message: `Token has **${result.charges.length}** charge(s) totaling **$${totalCharged.toFixed(6)}**.`
    };
  })
  .build();
