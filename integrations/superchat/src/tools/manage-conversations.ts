import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let conversationSchema = z.object({
  conversationId: z.string().describe('Unique conversation identifier'),
  conversationUrl: z.string().optional().describe('Resource URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  status: z.string().optional().describe('Conversation status (open, snoozed, done)'),
  snoozedUntil: z.string().optional().nullable().describe('Snooze expiry timestamp'),
  assignedUsers: z
    .array(
      z.object({
        userId: z.string().describe('User ID'),
        email: z.string().optional().describe('User email')
      })
    )
    .optional()
    .describe('Users assigned to the conversation'),
  labels: z
    .array(
      z.object({
        labelId: z.string().describe('Label ID'),
        name: z.string().optional().describe('Label name')
      })
    )
    .optional()
    .describe('Labels attached to the conversation'),
  inboxId: z.string().optional().nullable().describe('Inbox ID'),
  contact: z.record(z.string(), z.any()).optional().nullable().describe('Associated contact')
});

let mapConversation = (conv: any) => ({
  conversationId: conv.id,
  conversationUrl: conv.url,
  createdAt: conv.created_at,
  updatedAt: conv.updated_at,
  status: conv.status,
  snoozedUntil: conv.snoozed_until,
  assignedUsers: conv.assigned_users?.map((u: any) => ({
    userId: u.id,
    email: u.email
  })),
  labels: conv.labels?.map((l: any) => ({
    labelId: l.id,
    name: l.name
  })),
  inboxId: conv.inbox_id,
  contact: conv.contact
});

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `List conversations in the workspace with cursor-based pagination. Results are sorted by creation date descending.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of conversations to return'),
      after: z.string().optional().describe('Cursor for forward pagination'),
      before: z.string().optional().describe('Cursor for backward pagination')
    })
  )
  .output(
    z.object({
      conversations: z.array(conversationSchema).describe('List of conversations'),
      pagination: z
        .object({
          next: z.string().optional().nullable().describe('Next page cursor'),
          previous: z.string().optional().nullable().describe('Previous page cursor')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.listConversations({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let conversations = (result.results || []).map(mapConversation);

    return {
      output: {
        conversations,
        pagination: result.pagination
      },
      message: `Retrieved **${conversations.length}** conversation(s).`
    };
  })
  .build();

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve full details of a conversation including status, assigned users, labels, contact, messages, and notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to retrieve')
    })
  )
  .output(conversationSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.getConversation(ctx.input.conversationId);

    return {
      output: mapConversation(result),
      message: `Retrieved conversation \`${result.id}\` with status **${result.status}**.`
    };
  })
  .build();

export let updateConversation = SlateTool.create(spec, {
  name: 'Update Conversation',
  key: 'update_conversation',
  description: `Update a conversation's status, assigned users, labels, or inbox. Can be used to open, snooze, or mark conversations as done.`,
  instructions: [
    'When setting status to "snoozed", you must also provide a snoozedUntil timestamp.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to update'),
      status: z
        .enum(['open', 'snoozed', 'done'])
        .optional()
        .describe('New conversation status'),
      snoozedUntil: z
        .string()
        .optional()
        .describe(
          'UTC timestamp until when conversation is snoozed (required when status is "snoozed")'
        ),
      assignedUserIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to assign to the conversation'),
      labelIds: z
        .array(z.string())
        .optional()
        .describe('Label IDs to attach to the conversation'),
      inboxId: z.string().optional().describe('Inbox ID to move the conversation to')
    })
  )
  .output(conversationSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.updateConversation(ctx.input.conversationId, {
      status: ctx.input.status,
      snoozedUntil: ctx.input.snoozedUntil,
      assignedUsers: ctx.input.assignedUserIds,
      labels: ctx.input.labelIds,
      inboxId: ctx.input.inboxId
    });

    return {
      output: mapConversation(result),
      message: `Conversation \`${result.id}\` updated. Status: **${result.status}**.`
    };
  })
  .build();

export let deleteConversation = SlateTool.create(spec, {
  name: 'Delete Conversation',
  key: 'delete_conversation',
  description: `Permanently delete a conversation. This cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to delete')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('ID of the deleted conversation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.deleteConversation(ctx.input.conversationId);

    return {
      output: {
        conversationId: result.id || ctx.input.conversationId
      },
      message: `Conversation \`${ctx.input.conversationId}\` deleted.`
    };
  })
  .build();
