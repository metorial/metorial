import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let pinMessageTool = SlateTool.create(spec, {
  name: 'Pin/Unpin Message',
  key: 'pin_message',
  description: `Pin or unpin a message in a chat. Can pin a specific message, unpin a specific message, or unpin all messages. The bot must be an admin with the appropriate pin permission.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('Chat ID or @username'),
      action: z.enum(['pin', 'unpin', 'unpin_all']).describe('Action to perform'),
      messageId: z
        .number()
        .optional()
        .describe('Message ID to pin or unpin. Required for "pin" and "unpin" actions.'),
      disableNotification: z
        .boolean()
        .optional()
        .describe('Pin silently without sending a notification (pin only)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);
    let { chatId, action, messageId, disableNotification } = ctx.input;

    if (action === 'pin') {
      if (!messageId) throw new Error('messageId is required for pin action');
      await client.pinChatMessage({ chatId, messageId, disableNotification });
      return {
        output: { success: true },
        message: `Message **${messageId}** pinned in chat **${chatId}**.`
      };
    }

    if (action === 'unpin') {
      await client.unpinChatMessage({ chatId, messageId });
      return {
        output: { success: true },
        message: messageId
          ? `Message **${messageId}** unpinned in chat **${chatId}**.`
          : `Most recent pinned message unpinned in chat **${chatId}**.`
      };
    }

    if (action === 'unpin_all') {
      await client.unpinAllChatMessages({ chatId });
      return {
        output: { success: true },
        message: `All pinned messages unpinned in chat **${chatId}**.`
      };
    }

    return {
      output: { success: false },
      message: `Unknown action: ${action}`
    };
  })
  .build();
