import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve a single conversation by ID, including its messages. Returns conversation metadata, assignment info, and the message thread.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to retrieve'),
      includeMessages: z
        .boolean()
        .optional()
        .describe('Whether to also fetch messages (default: true)')
    })
  )
  .output(
    z.object({
      conversationId: z.string(),
      subject: z.string().optional(),
      contactId: z.string().optional(),
      assigneeId: z.string().optional(),
      teamId: z.string().optional(),
      priority: z.string().optional(),
      status: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      tags: z.array(z.any()).optional(),
      messages: z
        .array(
          z.object({
            messageId: z.string(),
            body: z.string().optional(),
            authorId: z.string().optional(),
            authorType: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let convData = await client.getConversation(ctx.input.conversationId);
    let conv = convData.conversation || convData;

    let messages: any[] | undefined;
    if (ctx.input.includeMessages !== false) {
      let msgData = await client.listMessages(ctx.input.conversationId);
      messages = (msgData.messages || []).map((m: any) => ({
        messageId: String(m.id),
        body: m.body,
        authorId: m.author_id ? String(m.author_id) : undefined,
        authorType: m.author_type,
        createdAt: m.created_at ? String(m.created_at) : undefined
      }));
    }

    return {
      output: {
        conversationId: String(conv.id),
        subject: conv.subject,
        contactId: conv.contact_id ? String(conv.contact_id) : undefined,
        assigneeId: conv.assignee_id ? String(conv.assignee_id) : undefined,
        teamId: conv.team_id ? String(conv.team_id) : undefined,
        priority: conv.priority,
        status: conv.status,
        createdAt: conv.created_at ? String(conv.created_at) : undefined,
        updatedAt: conv.updated_at ? String(conv.updated_at) : undefined,
        tags: conv.tags,
        messages
      },
      message: `Retrieved conversation **${conv.subject || conv.id}** with ${messages?.length ?? 0} messages.`
    };
  })
  .build();
