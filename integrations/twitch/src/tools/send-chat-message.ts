import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let sendChatMessage = SlateTool.create(spec, {
  name: 'Send Chat Message',
  key: 'send_chat_message',
  description: `Send a chat message to a Twitch channel. Supports regular messages, replies to existing messages, and chat announcements with optional color styling.`,
  instructions: [
    'For announcements, set **isAnnouncement** to true. Announcements appear highlighted in chat.',
    'Announcement colors: blue, green, orange, purple (default: primary/blue).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      broadcasterId: z.string().describe('Channel (broadcaster) ID to send the message in'),
      message: z.string().describe('Message text to send'),
      replyToMessageId: z.string().optional().describe('Message ID to reply to in the thread'),
      isAnnouncement: z
        .boolean()
        .optional()
        .describe('Send as an announcement instead of a regular message'),
      announcementColor: z
        .enum(['blue', 'green', 'orange', 'purple'])
        .optional()
        .describe('Announcement color')
    })
  )
  .output(
    z.object({
      messageId: z
        .string()
        .optional()
        .describe('ID of the sent message (not available for announcements)'),
      sent: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);
    let user = await client.getAuthenticatedUser();

    if (ctx.input.isAnnouncement) {
      await client.sendChatAnnouncement(
        ctx.input.broadcasterId,
        user.id,
        ctx.input.message,
        ctx.input.announcementColor
      );

      return {
        output: { sent: true },
        message: `Sent announcement to channel \`${ctx.input.broadcasterId}\``
      };
    }

    let result = await client.sendChatMessage(
      ctx.input.broadcasterId,
      user.id,
      ctx.input.message,
      { replyParentMessageId: ctx.input.replyToMessageId }
    );

    return {
      output: { messageId: result.messageId, sent: result.isSent },
      message: result.isSent
        ? `Message sent to channel \`${ctx.input.broadcasterId}\``
        : `Message was not delivered to channel \`${ctx.input.broadcasterId}\``
    };
  })
  .build();
