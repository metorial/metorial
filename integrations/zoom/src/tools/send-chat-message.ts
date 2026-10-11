import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZOOM_USER_AUTH_METHODS } from '../lib/authMethods';
import { assertChatRecipient, describeChatRecipient } from '../lib/chatRecipient';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let sendChatMessage = SlateTool.create(spec, {
  name: 'Send Chat Message',
  key: 'send_chat_message',
  description: `Send a Zoom Team Chat message to a channel or directly to a contact, optionally as a threaded reply. Provide either a channel ID or a contact (email, user ID, or member ID) as the recipient.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .default('me')
        .describe('Sender user ID or email. Use "me" for the authenticated user'),
      message: z.string().max(1024).describe('Message content to send'),
      toChannel: z.string().optional().describe('Channel ID to send the message to'),
      toContact: z
        .string()
        .optional()
        .describe('Email address, user ID, or member ID of the contact to message directly'),
      replyMainMessageId: z
        .string()
        .optional()
        .describe(
          'ID of the main (top-level) message of a thread to reply to. Replies to a reply are not supported; use the thread main message ID.'
        )
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the sent message')
    })
  )
  .authMethods(ZOOM_USER_AUTH_METHODS)
  .handleInvocation(async ctx => {
    assertChatRecipient(ctx.input.toChannel, ctx.input.toContact, 'to send a chat message');

    let client = new ZoomClient(ctx.auth.token);
    let result = await client.sendChatMessage(ctx.input.userId, {
      message: ctx.input.message,
      toChannel: ctx.input.toChannel,
      toContact: ctx.input.toContact,
      replyMainMessageId: ctx.input.replyMainMessageId
    });

    let recipient = describeChatRecipient(ctx.input.toChannel, ctx.input.toContact);

    return {
      output: {
        messageId: result.id
      },
      message: ctx.input.replyMainMessageId
        ? `Reply sent to thread **${ctx.input.replyMainMessageId}** in ${recipient}.`
        : `Message sent to ${recipient}.`
    };
  })
  .build();
