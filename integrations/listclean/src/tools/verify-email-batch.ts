import { SlateTool } from 'slates';
import { z } from 'zod';
import { ListcleanClient } from '../lib/client';
import { spec } from '../spec';

export let verifyEmailBatch = SlateTool.create(spec, {
  name: 'Verify Email Batch',
  key: 'verify_email_batch',
  description:
    'Submit up to 3,000 email addresses for asynchronous verification. Returns a list ID; use get_verification_list to check progress, then download_list_results when the list is COMPLETED.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      emails: z.array(z.string()).min(1).max(3000).describe('Email addresses to verify'),
      fileName: z
        .string()
        .optional()
        .describe('Optional source filename. The provider generates one when omitted.')
    })
  )
  .output(z.object({ listId: z.string().describe('Submitted verification list identifier') }))
  .handleInvocation(async ctx => {
    let client = new ListcleanClient({ token: ctx.auth.token });
    let listId = await client.verifyEmailBatch(ctx.input.emails, ctx.input.fileName);
    return {
      output: { listId },
      message: `Email batch submitted. Check list **${listId}** with get_verification_list.`
    };
  })
  .build();
