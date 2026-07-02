import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let deleteMessage = SlateTool.create(spec, {
  name: 'Delete Message',
  key: 'delete_message',
  description: `Permanently delete a message from a group or open channel. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      channelType: z.enum(['group_channels', 'open_channels']).describe('Type of channel'),
      channelUrl: z.string().describe('URL of the channel containing the message'),
      messageId: z.number().describe('ID of the message to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    await client.deleteMessage(
      ctx.input.channelType,
      ctx.input.channelUrl,
      ctx.input.messageId
    );

    return {
      output: {
        success: true
      },
      message: `Deleted message **${ctx.input.messageId}** from channel **${ctx.input.channelUrl}**.`
    };
  })
  .build();
