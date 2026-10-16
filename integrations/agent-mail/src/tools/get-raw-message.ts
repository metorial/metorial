import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRawMessage = SlateTool.create(spec, {
  name: 'Download Raw Message',
  key: 'get_raw_message',
  description:
    'Download the original MIME email as an EML file, including its original headers and complete message structure.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      inboxId: z
        .string()
        .describe('Inbox containing the message. Call list_inboxes to discover inbox IDs.'),
      messageId: z.string().describe('Message ID from list_messages or search_messages.')
    })
  )
  .output(z.object({ messageId: z.string(), size: z.number(), expiresAt: z.string() }))
  .handleInvocation(async ctx => {
    let message = await new Client({
      token: ctx.auth.token,
      podId: ctx.config.podId
    }).getRawMessage(ctx.input.inboxId, ctx.input.messageId);
    await ctx.addAttachment({
      type: 'url',
      url: message.download_url,
      mimeType: 'message/rfc822',
      filename: `${message.message_id}.eml`,
      refreshAt: new Date(Date.parse(message.expires_at) - 60_000).toISOString(),
      refreshReference: {
        kind: 'raw',
        inboxId: ctx.input.inboxId,
        messageId: ctx.input.messageId
      }
    });
    return {
      output: {
        messageId: message.message_id,
        size: message.size,
        expiresAt: message.expires_at
      },
      message: `Prepared original email ${message.message_id} for download.`
    };
  })
  .build();
