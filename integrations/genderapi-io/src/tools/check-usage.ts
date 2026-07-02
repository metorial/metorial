import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkUsage = SlateTool.create(spec, {
  name: 'Check API Usage',
  key: 'check_usage',
  description: `Check remaining API credits, usage statistics, and account expiration details. Useful for monitoring quota consumption and preventing service interruptions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      remainingCredits: z.number().describe('Number of API credits remaining'),
      expiresAt: z.number().describe('Unix timestamp when the credit package expires'),
      expiresAtFormatted: z.string().describe('Human-readable expiration date (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getUsage();

    let expiresDate =
      result.expiresAt > 0 ? new Date(result.expiresAt * 1000).toISOString() : 'No expiration';

    return {
      output: {
        remainingCredits: result.remaining,
        expiresAt: result.expiresAt,
        expiresAtFormatted: expiresDate
      },
      message: `**${result.remaining}** API credits remaining. Expires: ${expiresDate}.`
    };
  })
  .build();
