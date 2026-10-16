import { SlateTool } from 'slates';
import { z } from 'zod';
import { ListcleanClient } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify a single email address in real time. Returns a provider status of clean, dirty, unknown, or error, together with the provider's explanation. Verification may consume account credits.`,
  instructions: [
    'Provide a complete email address to verify.',
    'The provider status is clean, dirty, unknown, or error. Read remarks for the reason.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The verified email address'),
      status: z
        .string()
        .describe('Provider verification result: clean, dirty, unknown, or error'),
      remarks: z
        .string()
        .describe(
          'Explanation of the verification result, including specific checks performed'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ListcleanClient({
      token: ctx.auth.token
    });

    ctx.progress('Verifying email address...');
    let result = await client.verifyEmail(ctx.input.email);

    return {
      output: {
        email: result.email,
        status: result.status,
        remarks: result.remarks
      },
      message: `Email **${result.email}** verification result: **${result.status}**. ${result.remarks}`
    };
  })
  .build();
