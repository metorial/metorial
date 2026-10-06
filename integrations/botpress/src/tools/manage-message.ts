import { SlateTool } from 'slates';
import { z } from 'zod';
import { RuntimeClient } from '../lib/client';
import { resolveRuntimeParams, runtimeScopeFields } from '../lib/schemas';
import { spec } from '../spec';

export const manageMessageTool = SlateTool.create(spec, {
  key: 'manage_message',
  name: 'Manage Message',
  description:
    'Get an existing message or delete it. Discover bot IDs with list_bots and message IDs with list_messages.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['get', 'delete']),
      ...runtimeScopeFields,
      messageId: z.string().min(1).describe('Message ID from send_message or list_messages.')
    })
  )
  .output(
    z.object({
      messageId: z.string(),
      conversationId: z.string().optional(),
      userId: z.string().optional(),
      messageType: z.string().optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
      direction: z.string().optional(),
      createdAt: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new RuntimeClient({
      token: ctx.auth.token,
      ...resolveRuntimeParams(ctx.input, ctx.config)
    });
    if (ctx.input.action === 'delete') {
      await client.deleteMessage(ctx.input.messageId);
      return {
        output: { messageId: ctx.input.messageId, deleted: true },
        message: `Deleted message **${ctx.input.messageId}**.`
      };
    }
    const { message } = await client.getMessage(ctx.input.messageId);
    return {
      output: {
        messageId: message.id,
        conversationId: message.conversationId,
        userId: message.userId,
        messageType: message.type,
        payload: message.payload,
        direction: message.direction,
        createdAt: message.createdAt
      },
      message: `Retrieved message **${message.id}**.`
    };
  })
  .build();
