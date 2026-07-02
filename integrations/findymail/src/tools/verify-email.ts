import { SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify whether an email address is deliverable. Returns the verification status and the email provider. Useful for validating email lists exported from CRMs or purchased from third parties.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify.')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The email address that was verified.'),
      verified: z.boolean().describe('Whether the email is deliverable.'),
      provider: z
        .string()
        .optional()
        .describe('The email provider, e.g. "Google", "Microsoft".')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FindymailClient({ token: ctx.auth.token });

    let result = await client.verifyEmail({ email: ctx.input.email });

    return {
      output: {
        email: result?.email ?? ctx.input.email,
        verified: result?.verified ?? false,
        provider: result?.provider ?? undefined
      },
      message: result?.verified
        ? `Email **${ctx.input.email}** is **verified** and deliverable${result?.provider ? ` (provider: ${result.provider})` : ''}.`
        : `Email **${ctx.input.email}** is **not verified** or not deliverable.`
    };
  })
  .build();
