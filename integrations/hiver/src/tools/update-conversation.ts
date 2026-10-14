import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateConversation = SlateTool.create(spec, {
  name: 'Update Conversation',
  key: 'update_conversation',
  description: `Update properties of a conversation in a shared inbox. Supports modifying the conversation's status, assignee, and tags. Provide only the fields you want to change.`,
  instructions: [
    'Provide at least one field to update (status, assigneeId, assigneeEmail, or tags).',
    'Tags will replace the existing tags on the conversation when provided.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox ID from list_inboxes'),
      conversationId: z.string().describe('ID of the conversation to update'),
      status: z
        .string()
        .optional()
        .describe(
          'New status for the conversation ("open", "close" (or "closed"), or "pending")'
        ),
      assigneeId: z
        .string()
        .optional()
        .describe('User ID from search_inbox_users. Use either assigneeId or assigneeEmail.'),
      assigneeEmail: z
        .string()
        .email()
        .optional()
        .describe(
          'Email of an inbox member to assign. Use either assigneeEmail or assigneeId.'
        ),
      userEmail: z
        .string()
        .email()
        .optional()
        .describe(
          'Inbox user email when conversationId is a Gmail thread ID from that user’s mailbox'
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe('List of tag names or IDs to set on the conversation')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('ID of the updated conversation'),
      subject: z.string().optional().describe('Subject of the conversation'),
      status: z.string().optional().describe('Updated status'),
      assignee: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated assignee details'),
      tags: z.array(z.record(z.string(), z.unknown())).optional().describe('Updated tags'),
      updatedAt: z.string().optional().describe('Timestamp of the update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updated = await client.updateConversation(
      ctx.input.inboxId,
      ctx.input.conversationId,
      {
        status: ctx.input.status,
        assigneeId: ctx.input.assigneeId,
        tags: ctx.input.tags,
        assigneeEmail: ctx.input.assigneeEmail
      },
      ctx.input.userEmail
    );

    let changes: string[] = [];
    if (ctx.input.status) changes.push(`status → ${ctx.input.status}`);
    if (ctx.input.assigneeId) changes.push(`assignee → ${ctx.input.assigneeId}`);
    if (ctx.input.assigneeEmail) changes.push(`assignee → ${ctx.input.assigneeEmail}`);
    if (ctx.input.tags) changes.push(`tags → [${ctx.input.tags.join(', ')}]`);

    return {
      output: {
        conversationId: String(updated.id),
        subject: updated.subject,
        status: updated.status,
        assignee: updated.assignee,
        tags: updated.tags,
        updatedAt: updated.updatedAt
      },
      message: `Updated conversation **${updated.subject ?? updated.id}**: ${changes.join(', ')}.`
    };
  });
