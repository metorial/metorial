import { SlateTool } from 'slates';
import { z } from 'zod';
import { BoloFormsClient } from '../lib/client';
import { documentActionInputSchema, documentActionOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let sendReminder = SlateTool.create(spec, {
  name: 'Send Signing Reminder',
  key: 'send_reminder',
  description:
    'Send reminder emails or SMS to pending signers on a single-signature PDF or a PDF template respondent document. Respects signing order and returns reminded and skipped signer details.',
  constraints: [
    'Limited to 5 reminder requests per 15 minutes per API key.',
    'Reminders are rejected for SIGNED, VOID, EXPIRED, DECLINED, or DELETED documents.'
  ],
  tags: { destructive: false }
})
  .input(documentActionInputSchema)
  .output(
    documentActionOutputSchema.extend({
      remindedSigners: z.array(z.record(z.string(), z.unknown())).nullish(),
      skippedSigners: z.array(z.record(z.string(), z.unknown())).nullish()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BoloFormsClient({ token: ctx.auth.token });
    let result = await client.sendReminder(ctx.input);
    return {
      output: result,
      message: result.message || 'Signing reminder request completed.'
    };
  })
  .build();
