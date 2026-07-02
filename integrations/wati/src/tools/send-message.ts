import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a WhatsApp message within an active session. Supports text messages and file attachments (via URL).
Messages can only be sent within a 24-hour window after a user's last interaction.`,
  instructions: [
    'The target can be a phone number (with country code, e.g. 14155552671), a conversation ID, or a Channel:PhoneNumber format.',
    'File messages require a publicly accessible URL. Optionally include a caption.'
  ],
  constraints: [
    "Session messages can only be sent within a 24-hour window after the contact's last message. Use template messages for outbound communication outside this window."
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      target: z
        .string()
        .describe(
          'Recipient identifier: phone number with country code (e.g. 14155552671), conversation ID, or Channel:PhoneNumber.'
        ),
      messageText: z
        .string()
        .optional()
        .describe('Text content of the message. Required for text messages.'),
      fileUrl: z
        .string()
        .optional()
        .describe('Publicly accessible URL of a file to send as an attachment.'),
      fileCaption: z.string().optional().describe('Optional caption for file attachments.')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the sent message.'),
      conversationId: z.string().optional().describe('ID of the conversation.'),
      created: z.string().optional().describe('Timestamp when the message was created.'),
      status: z.string().optional().describe('Delivery status of the message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let result: any;

    if (ctx.input.fileUrl) {
      result = await client.sendFileViaUrl(
        ctx.input.target,
        ctx.input.fileUrl,
        ctx.input.fileCaption
      );
    } else if (ctx.input.messageText) {
      result = await client.sendTextMessage(ctx.input.target, ctx.input.messageText);
    } else {
      throw new Error('Either messageText or fileUrl must be provided.');
    }

    return {
      output: {
        messageId: result?.id,
        conversationId: result?.conversation_id,
        created: result?.created,
        status: result?.status
      },
      message: ctx.input.fileUrl
        ? `File message sent to **${ctx.input.target}**.`
        : `Text message sent to **${ctx.input.target}**.`
    };
  })
  .build();
