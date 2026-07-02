import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a chat message in Habitica. Send a message to a group (party or guild) or a private message to another user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageType: z
        .enum(['group', 'private'])
        .describe('Whether to send a group chat message or a private message'),
      message: z.string().describe('Message text to send'),
      groupId: z.string().optional().describe('Group ID or "party" for group messages'),
      targetUserId: z.string().optional().describe('Target user ID for private messages')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the message was sent successfully'),
      messageId: z.string().optional().describe('ID of the sent message (for group messages)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    if (ctx.input.messageType === 'group') {
      if (!ctx.input.groupId) throw new Error('groupId is required for group messages');
      let result = await client.postGroupChatMessage(ctx.input.groupId, ctx.input.message);
      return {
        output: {
          sent: true,
          messageId: result.id || result._id
        },
        message: `Sent message to group **${ctx.input.groupId}**`
      };
    }

    if (!ctx.input.targetUserId)
      throw new Error('targetUserId is required for private messages');
    await client.sendPrivateMessage(ctx.input.targetUserId, ctx.input.message);
    return {
      output: {
        sent: true
      },
      message: `Sent private message to user **${ctx.input.targetUserId}**`
    };
  })
  .build();
