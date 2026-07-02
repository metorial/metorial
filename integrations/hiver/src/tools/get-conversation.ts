import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve detailed information about a specific conversation in a shared inbox. Returns full conversation data including subject, status, assignee, tags, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('ID of the inbox containing the conversation'),
      conversationId: z.string().describe('ID of the conversation to retrieve')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Unique identifier of the conversation'),
      subject: z.string().optional().describe('Subject of the conversation'),
      status: z.string().optional().describe('Current status of the conversation'),
      assignee: z.record(z.string(), z.unknown()).optional().describe('Assigned user details'),
      tags: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Tags applied to the conversation'),
      inboxId: z.string().optional().describe('ID of the inbox this conversation belongs to'),
      from: z.record(z.string(), z.unknown()).optional().describe('Sender information'),
      to: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Recipient information'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let conversation = await client.getConversation(
      ctx.input.inboxId,
      ctx.input.conversationId
    );

    return {
      output: {
        conversationId: String(conversation.id),
        subject: conversation.subject,
        status: conversation.status,
        assignee: conversation.assignee,
        tags: conversation.tags,
        inboxId: conversation.inboxId ? String(conversation.inboxId) : undefined,
        from: conversation.from,
        to: conversation.to,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      },
      message: `Retrieved conversation **${conversation.subject ?? conversation.id}** (status: ${conversation.status ?? 'unknown'}).`
    };
  });
