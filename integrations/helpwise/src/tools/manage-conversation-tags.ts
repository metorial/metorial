import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageConversationTags = SlateTool.create(spec, {
  name: 'Manage Conversation Tags',
  key: 'manage_conversation_tags',
  description:
    'Apply tags to conversations or remove them. Discover conversation IDs with list_conversations and tag IDs with manage_tag.'
})
  .input(
    z.object({
      action: z
        .enum(['apply', 'remove'])
        .describe('Whether to apply or remove the selected tags'),
      conversationIds: z
        .array(z.number().int().positive())
        .min(1)
        .describe('Conversation IDs'),
      tagIds: z
        .array(z.number().int().positive())
        .min(1)
        .describe('Tag IDs from manage_tag with action list')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      result: z.unknown().optional().describe('Provider response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).manageConversationTags(
      ctx.input.action,
      ctx.input.conversationIds,
      ctx.input.tagIds
    );
    return {
      output: { success: true, result },
      message: `${ctx.input.action === 'apply' ? 'Applied' : 'Removed'} tags ${ctx.input.action === 'apply' ? 'on' : 'from'} ${ctx.input.conversationIds.length} conversation(s).`
    };
  })
  .build();
