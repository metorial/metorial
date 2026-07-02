import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify the deliverability of an email address. Returns the verification status indicating whether the email is valid, invalid, or unknown. Useful for cleaning contact lists before outreach.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('The verified email address'),
      status: z
        .string()
        .optional()
        .describe('Verification status (e.g. "valid", "invalid", "unknown")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.verifyEmail(ctx.input.email);

    return {
      output: {
        email: result.email ?? ctx.input.email,
        status: result.status
      },
      message: `Email **${ctx.input.email}** verification result: **${result.status ?? 'unknown'}**.`
    };
  })
  .build();
