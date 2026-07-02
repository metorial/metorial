import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let sendReminder = SlateTool.create(spec, {
  name: 'Send Reminder',
  key: 'send_reminder',
  description: `Send a signing reminder to all recipients who have not yet completed signing a document. Useful for nudging recipients on pending signature requests.`,
  instructions: ['Only works on documents that have been sent and are awaiting signatures.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to send a reminder for')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the document'),
      reminded: z.boolean().describe('Whether the reminder was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    await client.sendReminder(ctx.input.documentId);

    return {
      output: {
        documentId: ctx.input.documentId,
        reminded: true
      },
      message: `Reminder sent for document **${ctx.input.documentId}**.`
    };
  })
  .build();
