import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let sendGroupMessage = SlateTool.create(spec, {
  name: 'Send Group Message',
  key: 'send_group_message',
  description: `Send a text or media message to a WhatsApp group. Supports text messages, images, audio, video, PDFs, and other files.`,
  instructions: [
    'Use the "List WhatsApp Groups" tool to find group UUIDs.',
    'Media attachments must be publicly accessible URLs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fromNumber: z.string().describe('Your connected WhatsApp number (with country code)'),
      groupUuid: z.string().describe('UUID of the WhatsApp group'),
      text: z.string().optional().describe('Text content of the message or caption for media'),
      mediaUrl: z.string().optional().describe('Publicly accessible URL of media to send')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was sent successfully'),
      messageUuid: z.string().optional().describe('UUID of the sent message'),
      sentAt: z.string().optional().describe('Timestamp when the message was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoChatClient({ token: ctx.auth.token });

    let result: any;

    if (ctx.input.mediaUrl) {
      result = await client.sendGroupMediaMessage({
        fromNumber: ctx.input.fromNumber,
        groupUuid: ctx.input.groupUuid,
        url: ctx.input.mediaUrl,
        text: ctx.input.text
      });
    } else {
      result = await client.sendGroupTextMessage({
        fromNumber: ctx.input.fromNumber,
        groupUuid: ctx.input.groupUuid,
        text: ctx.input.text || ''
      });
    }

    return {
      output: {
        success: result.success ?? true,
        messageUuid: result.uuid || result.message_uuid,
        sentAt: result.sent_at || result.created_at
      },
      message: `Group message sent to group **${ctx.input.groupUuid}**.`
    };
  })
  .build();
