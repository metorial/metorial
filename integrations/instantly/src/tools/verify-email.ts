import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify an email address to check its deliverability before adding it to a campaign. Returns the verification status (valid, invalid, risky, catch_all, pending). If the result is pending, use the same tool with checkOnly to poll for the result.`,
  instructions: [
    'Set checkOnly to true to poll the verification status for an email that was previously submitted.',
    'If the initial verification returns "pending", poll again after a few seconds.'
  ]
})
  .input(
    z.object({
      email: z.string().describe('Email address to verify.'),
      checkOnly: z
        .boolean()
        .optional()
        .describe('If true, only check the status of a previously submitted verification.')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email address that was verified'),
      verificationStatus: z
        .string()
        .describe('Verification result: valid, invalid, risky, catch_all, pending, etc.'),
      catchAll: z.boolean().optional().describe('Whether the domain is a catch-all'),
      creditsUsed: z.number().optional().describe('Number of verification credits consumed'),
      creditsRemaining: z.number().optional().describe('Remaining verification credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;

    if (ctx.input.checkOnly) {
      result = await client.getVerificationStatus(ctx.input.email);
    } else {
      result = await client.verifyEmail(ctx.input.email);
    }

    return {
      output: {
        email: result.email,
        verificationStatus: result.verification_status,
        catchAll: result.catch_all,
        creditsUsed: result.credits_used,
        creditsRemaining: result.credits
      },
      message: `Email **${result.email}** verification status: **${result.verification_status}**.`
    };
  })
  .build();
