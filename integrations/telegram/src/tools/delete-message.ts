import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let deleteMessageTool = SlateTool.create(spec, {
  name: 'Delete Message',
  key: 'delete_message',
  description: `Delete a message from a chat. The bot can delete its own messages in any chat, and can delete other users' messages in groups/supergroups if it has the appropriate admin permissions.`,
  constraints: [
    'Messages can only be deleted within 48 hours of being sent in groups (no limit for bot own messages in private chats).'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('Chat ID where the message exists'),
      messageId: z.number().describe('ID of the message to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    let result = await client.deleteMessage({
      chatId: ctx.input.chatId,
      messageId: ctx.input.messageId
    });

    return {
      output: {
        success: result
      },
      message: `Message **${ctx.input.messageId}** deleted from chat **${ctx.input.chatId}**.`
    };
  })
  .build();
