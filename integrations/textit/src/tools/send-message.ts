import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to a single contact. For sending to multiple recipients, use **Send Broadcast** instead. Supports text content, media attachments, and quick reply options.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactUuid: z.string().describe('UUID of the recipient contact'),
      text: z.string().describe('The message text to send'),
      attachments: z.array(z.string()).optional().describe('Media UUIDs to attach (max 10)'),
      quickReplies: z.array(z.string()).optional().describe('Quick reply options (max 10)')
    })
  )
  .output(
    z.object({
      messageUuid: z.string().describe('UUID of the sent message'),
      contactUuid: z.string().describe('UUID of the recipient contact'),
      text: z.string().describe('Text of the sent message'),
      status: z.string().describe('Status of the message (e.g., queued)'),
      createdOn: z.string().describe('When the message was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let message = await client.sendMessage({
      contact: ctx.input.contactUuid,
      text: ctx.input.text,
      attachments: ctx.input.attachments,
      quick_replies: ctx.input.quickReplies
    });

    return {
      output: {
        messageUuid: message.uuid,
        contactUuid: message.contact.uuid,
        text: message.text,
        status: message.status,
        createdOn: message.created_on
      },
      message: `Message sent to **${message.contact.name || message.contact.uuid}** (status: ${message.status}).`
    };
  })
  .build();
