import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let sendReminder = SlateTool.create(spec, {
  name: 'Send Reminder',
  key: 'send_reminder',
  description: `Send a manual reminder to all recipients of a PandaDoc document who have not yet completed their actions.`,
  instructions: ['The document must be in a sent or pending status for reminders to work.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document to send a reminder for')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the reminder was sent successfully'),
      documentId: z.string().describe('UUID of the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.sendReminder(ctx.input.documentId);

    return {
      output: {
        sent: true,
        documentId: ctx.input.documentId
      },
      message: `Reminder sent for document \`${ctx.input.documentId}\`.`
    };
  })
  .build();
