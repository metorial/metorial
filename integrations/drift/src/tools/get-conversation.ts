import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve detailed information about a specific Drift conversation, including participants, tags, status, and related playbook. Optionally include the message transcript.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('Drift conversation ID'),
      includeMessages: z
        .boolean()
        .optional()
        .describe('Whether to also fetch the conversation messages')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('Drift conversation ID'),
      status: z.string().optional().describe('Conversation status'),
      contactId: z.number().optional().describe('Associated contact ID'),
      createdAt: z.number().optional().describe('Unix timestamp of creation'),
      updatedAt: z.number().optional().describe('Unix timestamp of last update'),
      inboxId: z.number().optional().describe('Inbox ID'),
      participants: z.array(z.number()).optional().describe('Participant user IDs'),
      relatedPlaybookId: z.number().optional().describe('ID of the related playbook'),
      conversationTags: z
        .array(
          z.object({
            name: z.string(),
            color: z.string().optional()
          })
        )
        .optional()
        .describe('Tags on this conversation'),
      messages: z
        .array(
          z.object({
            messageId: z.string().optional(),
            body: z.string().optional(),
            author: z.any().optional(),
            createdAt: z.number().optional(),
            type: z.string().optional()
          })
        )
        .optional()
        .describe('Conversation messages, if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    let conversation = await client.getConversation(ctx.input.conversationId);

    let messages: any[] | undefined;
    if (ctx.input.includeMessages) {
      let msgResult = await client.getConversationMessages(ctx.input.conversationId);
      messages = msgResult.messages.map((m: any) => ({
        messageId: m.id ? String(m.id) : undefined,
        body: m.body,
        author: m.author,
        createdAt: m.createdAt,
        type: m.type
      }));
    }

    return {
      output: {
        conversationId: conversation.id,
        status: conversation.status,
        contactId: conversation.contactId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        inboxId: conversation.inboxId,
        participants: conversation.participants,
        relatedPlaybookId: conversation.relatedPlaybookId,
        conversationTags: conversation.conversationTags,
        messages
      },
      message: `Retrieved conversation \`${conversation.id}\` (${conversation.status || 'unknown status'}).${messages ? ` Includes ${messages.length} message(s).` : ''}`
    };
  })
  .build();
