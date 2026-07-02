import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let blockUser = SlateTool.create(spec, {
  name: 'Block/Unblock User',
  key: 'block_user',
  description: `Block or unblock a user. When a user blocks another, they stop receiving messages from the blocked user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user performing the block/unblock'),
      targetUserId: z.string().describe('ID of the user to block or unblock'),
      action: z
        .enum(['block', 'unblock'])
        .describe('Whether to block or unblock the target user')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      action: z.string().describe('The action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'block') {
      await client.blockUser(ctx.input.userId, ctx.input.targetUserId);
    } else {
      await client.unblockUser(ctx.input.userId, ctx.input.targetUserId);
    }

    return {
      output: {
        success: true,
        action: ctx.input.action
      },
      message: `User **${ctx.input.userId}** ${ctx.input.action}ed user **${ctx.input.targetUserId}**.`
    };
  })
  .build();
