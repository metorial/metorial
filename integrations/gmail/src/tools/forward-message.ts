import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buildForwardedMimeMessage,
  decodeBase64Url,
  hasMimeHeaderBodySeparator
} from '../lib/mime';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let forwardMessage = SlateTool.create(spec, {
  name: 'Forward Message',
  key: 'forward_message',
  description:
    'Forward an existing Gmail message to new recipients while preserving its complete MIME body and attachments.',
  instructions: [
    'Provide the Gmail message ID and at least one recipient in **to**.',
    'The forwarded message uses a **Fwd:** subject and preserves the original MIME content, including attachments.',
    'The forward is sent as a new Gmail thread rather than as a reply in the source thread.',
    'The rebuilt raw MIME is submitted base64-encoded inside a JSON messages.send request, so forwards whose original attachments total more than roughly 5 MB fail with a Gmail 4xx error.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(gmailActionScopes.forwardMessage)
  .input(
    z.object({
      messageId: z.string().describe('ID of the Gmail message to forward.'),
      to: z.array(z.string().email()).min(1).describe('Recipient email addresses.'),
      cc: z.array(z.string().email()).optional().describe('CC recipient email addresses.'),
      bcc: z.array(z.string().email()).optional().describe('BCC recipient email addresses.')
    })
  )
  .output(
    z.object({
      sourceMessageId: z.string().describe('ID of the original message.'),
      messageId: z.string().describe('ID of the sent forwarded message.'),
      threadId: z.string().describe('Thread ID of the sent forwarded message.'),
      subject: z.string().describe('Subject of the forwarded message.'),
      labelIds: z.array(z.string()).describe('Labels applied to the sent message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });
    let source = await client.getMessage(ctx.input.messageId, 'raw');

    if (!source.raw) {
      throw createApiServiceError(
        `Gmail did not return raw MIME content for message ${ctx.input.messageId}.`
      );
    }

    let original: string;
    try {
      original = decodeBase64Url(source.raw);
    } catch {
      throw createApiServiceError(
        `Gmail returned invalid base64url MIME content for message ${ctx.input.messageId}.`
      );
    }

    if (!hasMimeHeaderBodySeparator(original)) {
      throw createApiServiceError(
        `Gmail returned malformed MIME content for message ${ctx.input.messageId}.`
      );
    }

    let forwarded = buildForwardedMimeMessage({
      original,
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc
    });
    let result = await client.sendRawMessage(forwarded.raw);

    return {
      output: {
        sourceMessageId: ctx.input.messageId,
        messageId: result.id,
        threadId: result.threadId,
        subject: forwarded.subject,
        labelIds: result.labelIds || []
      },
      message: `Message **${ctx.input.messageId}** forwarded to **${ctx.input.to.join(', ')}**.`
    };
  });
