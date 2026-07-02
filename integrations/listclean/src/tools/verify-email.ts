import { SlateTool } from 'slates';
import { z } from 'zod';
import { ListcleanClient } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify a single email address in real time. Checks syntax, DNS/MX records, SMTP responses, and risk signals to classify the email as **clean** (valid), **dirty** (invalid), or **unknown** (unverifiable).
Each verification consumes one credit. Duplicate and unknown results are not charged.`,
  instructions: [
    'Provide a complete email address to verify.',
    'The status will be "clean" for valid emails, "dirty" for invalid, or "unknown" for unverifiable addresses.'
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
      status: z.string().describe('Verification result: clean, dirty, or unknown'),
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
        email: result.email || ctx.input.email,
        status: result.status,
        remarks: result.remarks
      },
      message: `Email **${result.email || ctx.input.email}** verification result: **${result.status}**. ${result.remarks}`
    };
  })
  .build();
