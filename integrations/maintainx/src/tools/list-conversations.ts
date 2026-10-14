import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description:
    'Lists MaintainX conversations and their IDs for send_message. For multi-organization keys, call list_organizations and pass organizationId.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      type: z.enum(['GROUP', 'DM', 'TEAM']).optional().describe('Filter by conversation type'),
      onlyNamed: z.boolean().optional().describe('Only return conversations with a name'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum results per page; defaults to 100'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      conversations: z.array(
        z.object({
          conversationId: z.number().describe('Conversation ID for send_message'),
          name: z.string().optional().describe('Conversation name, when set'),
          type: z.string().optional().describe('Conversation type')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await Client.fromContext(ctx).listConversations(ctx.input);
    let conversations = (result.conversations ?? []).map(
      (conversation: { id: number; name?: string | null; type?: string }) => ({
        conversationId: conversation.id,
        name: conversation.name ?? undefined,
        type: conversation.type ?? undefined
      })
    );
    return {
      output: { conversations, nextCursor: result.nextCursor ?? undefined },
      message: `Found ${conversations.length} conversation(s).`
    };
  })
  .build();
