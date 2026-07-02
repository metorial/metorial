import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `List conversations for a specific user within a project. Returns conversation histories from chat-based deployed flows.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The project/flow ID to list conversations for'),
      userId: z.string().describe('The user ID whose conversations to retrieve')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of conversation objects with id, title, created_at, etc.'),
      hasMore: z.boolean().describe('Whether more conversations are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.getConversations(ctx.input.projectId, ctx.input.userId);

    return {
      output: {
        conversations: result.data,
        hasMore: result.has_more
      },
      message: `Retrieved **${result.data.length}** conversation(s) for user in project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let manageConversation = SlateTool.create(spec, {
  name: 'Manage Conversation',
  key: 'manage_conversation',
  description: `Manage a conversation within a project. Rename, archive/unarchive, or delete a conversation.`,
  instructions: [
    'Provide exactly one action: rename, archive, or delete.',
    'For rename, provide the new title.',
    'For archive, set archive to true to archive or false to unarchive.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The project/flow ID'),
      conversationId: z.string().describe('The conversation ID to manage'),
      userId: z.string().describe('The user ID that owns the conversation'),
      action: z
        .enum(['rename', 'archive', 'delete'])
        .describe('The action to perform on the conversation'),
      title: z
        .string()
        .optional()
        .describe('New title for the conversation (required for rename action)'),
      archive: z
        .boolean()
        .optional()
        .describe(
          'Set to true to archive, false to unarchive (for archive action, default true)'
        )
    })
  )
  .output(
    z.object({
      conversation: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The updated conversation object (not returned for delete)'),
      deleted: z.boolean().optional().describe('Whether the conversation was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    if (ctx.input.action === 'rename') {
      if (!ctx.input.title) {
        throw new Error('Title is required for the rename action');
      }
      let conversation = await client.renameConversation(
        ctx.input.projectId,
        ctx.input.conversationId,
        ctx.input.userId,
        ctx.input.title
      );
      return {
        output: { conversation },
        message: `Renamed conversation **${ctx.input.conversationId}** to **${ctx.input.title}**.`
      };
    }

    if (ctx.input.action === 'archive') {
      let isArchived = ctx.input.archive !== false;
      let conversation = await client.archiveConversation(
        ctx.input.projectId,
        ctx.input.conversationId,
        ctx.input.userId,
        isArchived
      );
      return {
        output: { conversation },
        message: `${isArchived ? 'Archived' : 'Unarchived'} conversation **${ctx.input.conversationId}**.`
      };
    }

    // delete
    await client.deleteConversation(
      ctx.input.projectId,
      ctx.input.conversationId,
      ctx.input.userId
    );
    return {
      output: { deleted: true },
      message: `Deleted conversation **${ctx.input.conversationId}**.`
    };
  })
  .build();

export let listUserConversations = SlateTool.create(spec, {
  name: 'List All User Conversations',
  key: 'list_user_conversations',
  description: `List all user conversations for a project via the manager interface. Returns conversations across all users, useful for admin/oversight purposes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The project ID to list all user conversations for')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of all user conversations with id, title, user_id, created_at, etc.'),
      hasMore: z.boolean().describe('Whether more conversations are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.getUserConversations(ctx.input.projectId);

    return {
      output: {
        conversations: result.data,
        hasMore: result.has_more
      },
      message: `Retrieved **${result.data.length}** user conversation(s) for project **${ctx.input.projectId}**.`
    };
  })
  .build();
