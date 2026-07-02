import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let getAttachment = SlateTool.create(spec, {
  name: 'Get Attachment',
  key: 'get_attachment',
  description: `Download an email attachment by its ID. Returns the attachment as a file attachment plus its size. Use the attachment IDs from the message's attachments list.`,
  tags: {
    readOnly: true
  }
})
  .scopes(gmailActionScopes.getAttachment)
  .input(
    z.object({
      messageId: z.string().describe('ID of the message containing the attachment.'),
      attachmentId: z.string().describe('ID of the attachment to download.')
    })
  )
  .output(
    z.object({
      size: z.number().describe('Attachment size in bytes.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let attachment = await client.getAttachment(ctx.input.messageId, ctx.input.attachmentId);
    let normalizedData = attachment.data.replace(/-/g, '+').replace(/_/g, '/');
    let padding = normalizedData.length % 4;
    if (padding > 0) {
      normalizedData = normalizedData.padEnd(normalizedData.length + (4 - padding), '=');
    }

    return {
      output: {
        size: attachment.size
      },
      attachments: [createBase64Attachment(normalizedData)],
      message: `Downloaded attachment (**${attachment.size}** bytes).`
    };
  });
