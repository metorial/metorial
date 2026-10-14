import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let closeConversations = SlateTool.create(spec, {
  name: 'Close Conversations',
  key: 'close_conversations',
  description:
    'Close up to 99 Helpwise conversations. Use list_conversations to discover conversation IDs.'
})
  .input(
    z.object({
      conversationIds: z
        .array(z.number().int().positive())
        .min(1)
        .max(99)
        .describe('Conversation IDs to close; fewer than 100 per request')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      result: z.unknown().optional().describe('Provider response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).closeConversations(
      ctx.input.conversationIds
    );
    return {
      output: { success: true, result },
      message: `Closed ${ctx.input.conversationIds.length} conversation(s).`
    };
  })
  .build();
