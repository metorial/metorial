import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SkyfireClient } from '../lib/client';
import { spec } from '../spec';

export let getTokenCharges = SlateTool.create(spec, {
  name: 'Get Token Charges',
  key: 'get_token_charges',
  description: `Retrieve a page of charges applied to a specific PAY or KYA+PAY token for auditing and reconciliation. Shows what was authorized versus what was actually charged, including settlement details.`,
  instructions: [
    'The tokenId is the jti claim value from the token JWT body, not the full JWT string.',
    'Pass nextPageCursor as pageCursor to retrieve the next page. A missing settlement timestamp means settlement is not reported yet.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tokenId: z.string().describe('The jti (JWT ID) claim value from the token body'),
      size: z.number().optional().describe('Maximum charges per page; use an integer'),
      pageCursor: z.string().optional().describe('nextPageCursor from the previous response')
    })
  )
  .output(
    z.object({
      charges: z
        .array(
          z.object({
            audience: z.string().optional().describe('Audience UUID (seller agent)'),
            value: z.string().describe('Charged amount in USD'),
            chargedAt: z.string().describe('ISO 8601 timestamp when the charge was made'),
            claimId: z.string().describe('UUID of the charge claim'),
            sellerServiceId: z
              .string()
              .optional()
              .describe('UUID of the seller service that charged'),
            settledAt: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp when the charge was settled'),
            subject: z.string().optional().describe('Subject UUID (buyer agent)'),
            tokenType: z.string().optional().describe('Token type (pay or kya-pay)'),
            tokenId: z.string().optional().describe('Payment token ID'),
            chargeId: z.string().optional().describe('Unique charge ID'),
            network: z.string().optional().describe('Payment network'),
            raw: z.unknown().optional().describe('Complete provider charge record')
          })
        )
        .describe('Charges returned on this page'),
      nextPageCursor: z.string().optional().describe('Cursor for the next page, when present'),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SkyfireClient({ token: ctx.auth.token });

    if (ctx.input.size !== undefined && !Number.isInteger(ctx.input.size)) {
      throw createApiServiceError('size must be an integer.');
    }
    let result = await client.getTokenCharges(ctx.input.tokenId, {
      size: ctx.input.size,
      pageCursor: ctx.input.pageCursor
    });
    let charges = result.data.map(charge => ({
      ...charge,
      settledAt: typeof charge.settledAt === 'string' ? charge.settledAt : undefined,
      raw: charge
    }));

    return {
      output: { charges, nextPageCursor: result.nextPageCursor, raw: result },
      message: `Retrieved **${charges.length}** charge(s) on this page${result.nextPageCursor ? '; more pages are available' : ''}.`
    };
  })
  .build();
