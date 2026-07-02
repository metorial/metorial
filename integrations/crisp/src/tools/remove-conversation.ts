import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeConversation = SlateTool.create(spec, {
  name: 'Remove Conversation',
  key: 'remove_conversation',
  description: `Permanently remove a conversation from your Crisp workspace. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID of the conversation to remove')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session ID of the removed conversation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });
    await client.removeConversation(ctx.input.sessionId);

    return {
      output: { sessionId: ctx.input.sessionId },
      message: `Removed conversation **${ctx.input.sessionId}**.`
    };
  })
  .build();
