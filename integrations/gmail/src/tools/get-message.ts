import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, parseMessage } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description: `Retrieve a single email message by its ID. Returns the full message including parsed headers, body (text and HTML), and attachment metadata.`,
  tags: {
    readOnly: true
  }
})
  .scopes(gmailActionScopes.getMessage)
  .input(
    z.object({
      messageId: z.string().describe('The ID of the message to retrieve.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message ID.'),
      threadId: z.string().describe('Thread ID this message belongs to.'),
      labelIds: z.array(z.string()).describe('Labels applied to this message.'),
      snippet: z.string().describe('Short snippet preview of the message.'),
      historyId: z.string().describe('History ID at the time of this message.'),
      internalDate: z.string().describe('Internal date timestamp (epoch ms as string).'),
      sizeEstimate: z.number().describe('Estimated size in bytes.'),
      from: z.string().optional().describe('Sender email address.'),
      to: z.string().optional().describe('Recipient email addresses.'),
      cc: z.string().optional().describe('CC recipients.'),
      bcc: z.string().optional().describe('BCC recipients.'),
      subject: z.string().optional().describe('Email subject line.'),
      date: z.string().optional().describe('Date the message was sent.'),
      mimeMessageId: z
        .string()
        .optional()
        .describe('MIME Message-ID header (for threading/replying).'),
      bodyText: z.string().optional().describe('Plain text body.'),
      bodyHtml: z.string().optional().describe('HTML body.'),
      attachments: z
        .array(
          z.object({
            attachmentId: z.string().describe('Attachment ID for downloading.'),
            filename: z.string().describe('File name.'),
            mimeType: z.string().describe('MIME type.'),
            size: z.number().describe('Size in bytes.')
          })
        )
        .describe('List of attachments.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let message = await client.getMessage(ctx.input.messageId);
    let parsed = parseMessage(message);

    return {
      output: parsed,
      message: `Retrieved message from **${parsed.from || 'unknown'}**: "${parsed.subject || '(no subject)'}".`
    };
  });
