import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getNotificationMessage } from '../lib/client';
import { spec } from '../spec';

export let copyMailbox = SlateTool.create(spec, {
  name: 'Copy Mailbox',
  key: 'copy_mailbox',
  description:
    'Request a copy of an existing Parseur mailbox. Copying is asynchronous; use list_mailboxes after a few minutes to find the new mailbox.',
  tags: { destructive: false }
})
  .input(
    z.object({
      mailboxId: z
        .number()
        .int()
        .positive()
        .describe('Mailbox ID to copy. Call list_mailboxes to discover mailbox IDs.')
    })
  )
  .output(
    z.object({
      sourceMailboxId: z.number().describe('Mailbox whose copy was requested'),
      submitted: z.boolean().describe('Whether the copy request was accepted'),
      resultMessage: z.string().describe('Provider status message for the copy request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.copyMailbox(ctx.input.mailboxId);
    let resultMessage = getNotificationMessage(result, 'Mailbox copy requested.');

    return {
      output: {
        sourceMailboxId: ctx.input.mailboxId,
        submitted: true,
        resultMessage
      },
      message: resultMessage
    };
  })
  .build();
