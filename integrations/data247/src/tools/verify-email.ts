import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailResultSchema = z.object({
  email: z.string().optional().describe('The email address that was verified'),
  valid: z.string().optional().describe('Whether the email is valid'),
  reason: z.string().optional().describe('Reason for the validity status'),
  freeAccount: z
    .string()
    .optional()
    .describe('Whether the email is from a free email provider')
});

let mapResult = (raw: Record<string, string>) => ({
  email: raw.email,
  valid: raw.valid,
  reason: raw.reason,
  freeAccount: raw.free_account || raw.free
});

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify that email addresses are properly formatted and have working mailboxes. Returns validity status, reason for invalidity, and whether the address is from a free email provider. Useful for cleaning email lists and ensuring deliverability.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      emails: z.array(z.string()).min(1).max(100).describe('Email addresses to verify')
    })
  )
  .output(
    z.object({
      results: z
        .array(emailResultSchema)
        .describe('Verification results for each email address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { emails } = ctx.input;

    let results: Record<string, string>[];

    if (emails.length === 1) {
      let result = await client.verifyEmail(emails[0]!);
      results = [result];
    } else {
      results = await client.verifyEmailBatch(emails);
    }

    let mapped = results.map(mapResult);

    return {
      output: { results: mapped },
      message: `Verified **${emails.length}** email address(es).`
    };
  })
  .build();
