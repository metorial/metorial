import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let listConversationsTool = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `List conversations (messages) for the authenticated user. Filter by scope (inbox, unread, archived, starred, sent). Returns conversation metadata and the most recent message.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum(['inbox', 'unread', 'archived', 'starred', 'sent'])
        .optional()
        .describe('Filter conversations by scope')
    })
  )
  .output(
    z.object({
      conversations: z.array(
        z.object({
          conversationId: z.string().describe('Conversation ID'),
          subject: z.string().optional().nullable().describe('Conversation subject'),
          workflowState: z.string().optional().describe('State (read, unread, archived)'),
          lastMessage: z
            .string()
            .optional()
            .nullable()
            .describe('Preview of the last message'),
          lastMessageAt: z
            .string()
            .optional()
            .nullable()
            .describe('Timestamp of last message'),
          messageCount: z.number().optional().describe('Total messages in conversation'),
          participantCount: z.number().optional().describe('Number of participants'),
          isPrivate: z
            .boolean()
            .optional()
            .describe('Whether this is a private (2-person) conversation')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let raw = await client.listConversations({
      scope: ctx.input.scope
    });

    let conversations = raw.map((c: any) => ({
      conversationId: String(c.id),
      subject: c.subject,
      workflowState: c.workflow_state,
      lastMessage: c.last_message,
      lastMessageAt: c.last_message_at,
      messageCount: c.message_count,
      participantCount: c.participant_count,
      isPrivate: c.private
    }));

    return {
      output: { conversations },
      message: `Found **${conversations.length}** conversation(s).`
    };
  })
  .build();
