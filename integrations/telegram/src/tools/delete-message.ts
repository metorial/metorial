import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let deleteMessageTool = SlateTool.create(spec, {
  name: 'Delete Message',
  key: 'delete_message',
  description: `Delete a message from a chat. The bot can delete its own messages in any chat, and can delete other users' messages in groups/supergroups if it has the appropriate admin permissions.`,
  constraints: [
    'A message can only be deleted if it was sent less than 48 hours ago.',
    'Service messages about supergroup, channel, or forum topic creation cannot be deleted.',
    "Deleting other users' messages in supergroups and channels requires the can_delete_messages administrator right."
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
