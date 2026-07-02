import { SlateTool } from 'slates';
import { z } from 'zod';
import { SkyfireClient } from '../lib/client';
import { spec } from '../spec';

export let createToken = SlateTool.create(spec, {
  name: 'Create Token',
  key: 'create_token',
  description: `Create a JWT-based token for authorizing payments and/or sharing identity with sellers. Supports three token types:
- **PAY**: Authorizes payment only
- **KYA**: Verifies agent identity without payment
- **KYA+PAY**: Combines identity verification and payment authorization

Use a seller service ID (from the service directory) or a seller domain/URL to target the token. Set an appropriate expiration window (5–10 minutes recommended for one-time use).`,
  instructions: [
    'For PAY or KYA+PAY tokens, tokenAmount is required and must be a positive decimal string within your wallet balance.',
    'Provide either sellerServiceId or sellerDomainOrUrl, not both.',
    'Default expiration is 5 minutes for domain-based tokens and 24 hours for service ID-based tokens.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z
        .enum(['kya', 'pay', 'kya+pay'])
        .describe('Token type: kya (identity only), pay (payment only), or kya+pay (both)'),
      tokenAmount: z
        .string()
        .optional()
        .describe(
          'Maximum charge amount in USD as a decimal string (required for pay and kya+pay)'
        ),
      sellerServiceId: z
        .string()
        .optional()
        .describe('UUID of the seller service from the marketplace directory'),
      sellerDomainOrUrl: z
        .string()
        .optional()
        .describe('Website URL or domain of the seller (alternative to sellerServiceId)'),
      buyerTag: z.string().optional().describe('Internal identifier for tracking this token'),
      expiresAt: z.number().optional().describe('Unix timestamp for token expiration'),
      identityPermissions: z
        .array(z.string())
        .optional()
        .describe('Additional identity fields to include in KYA or KYA+PAY tokens')
    })
  )
  .output(
    z.object({
      token: z
        .string()
        .describe('Signed JWT token to pass to the seller when calling their API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SkyfireClient({ token: ctx.auth.token });

    let result = await client.createToken({
      type: ctx.input.type,
      tokenAmount: ctx.input.tokenAmount,
      sellerServiceId: ctx.input.sellerServiceId,
      sellerDomainOrUrl: ctx.input.sellerDomainOrUrl,
      buyerTag: ctx.input.buyerTag,
      expiresAt: ctx.input.expiresAt,
      identityPermissions: ctx.input.identityPermissions
    });

    return {
      output: result,
      message: `Created **${ctx.input.type}** token${ctx.input.tokenAmount ? ` for $${ctx.input.tokenAmount}` : ''}.`
    };
  })
  .build();
