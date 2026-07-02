import { SlateTool } from 'slates';
import { z } from 'zod';
import { SkyfireClient } from '../lib/client';
import { spec } from '../spec';

export let introspectToken = SlateTool.create(spec, {
  name: 'Introspect Token',
  key: 'introspect_token',
  description: `Verify whether a Skyfire token (KYA, PAY, or KYA+PAY) is valid and check its remaining balance. Useful for sellers to validate a buyer's token before processing a request.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      skyfireToken: z.string().describe('The KYA, PAY, or KYA+PAY JWT token to validate')
    })
  )
  .output(
    z.object({
      isValid: z.boolean().describe('Whether the token is currently valid'),
      remainingBalance: z
        .string()
        .optional()
        .describe('Remaining balance on the token (for PAY or KYA+PAY tokens)'),
      validationError: z.string().optional().describe('Error message if the token is invalid')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SkyfireClient({ token: ctx.auth.token });

    let result = await client.introspectToken(ctx.input.skyfireToken);

    let message = result.isValid
      ? `Token is **valid**${result.remainingBalance ? ` with remaining balance of **$${result.remainingBalance}**` : ''}.`
      : `Token is **invalid**: ${result.validationError || 'unknown error'}.`;

    return {
      output: result,
      message
    };
  })
  .build();
