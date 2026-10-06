import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  botIdSchema,
  conversationIdSchema,
  conversationSchema,
  pageSchema,
  paginationSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Retrieve conversations with AI bots. Filter by bot or search by keyword.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: botIdSchema.optional(),
      keyword: z.string().optional().describe('Search conversations by partial name match'),
      includeDocumentIds: z.boolean().optional().describe('Include focus mode document IDs.'),
      page: pageSchema
    })
  )
  .output(
    z.object({
      conversations: z.array(conversationSchema),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listConversations({
      botId: ctx.input.botId,
      keyword: ctx.input.keyword,
      includeDocumentIds: ctx.input.includeDocumentIds,
      page: ctx.input.page
    });

    return {
      output: result,
      message: `Found **${result.conversations.length}** conversation(s)${result.pagination.total > result.conversations.length ? ` (${result.pagination.total} total)` : ''}.`
    };
  });

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve a conversation by its ID. Call list_conversations to discover available conversations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: conversationIdSchema,
      includeDocumentIds: z.boolean().optional().describe('Include focus mode document IDs.')
    })
  )
  .output(conversationSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let conversation = await client.getConversation(
      ctx.input.conversationId,
      ctx.input.includeDocumentIds
    );

    return {
      output: conversation,
      message: `Retrieved conversation **${conversation.name}** with bot \`${conversation.botId}\`.`
    };
  });

export let createConversation = SlateTool.create(spec, {
  name: 'Create Conversation',
  key: 'create_conversation',
  description: `Start a new conversation with an AI bot discovered with list_bots. Optionally enable focus mode by specifying document IDs to restrict the bot's knowledge to only those documents.`,
  constraints: [
    'Focus mode supports up to 1,000 document IDs.',
    'Documents must exist in folders the bot has access to.'
  ]
})
  .input(
    z.object({
      name: z.string().min(1).describe('Name for the conversation'),
      botId: botIdSchema,
      documentIds: z
        .array(z.string().min(1))
        .max(1000)
        .optional()
        .describe(
          'Document IDs from list_documents for focus mode, limiting bot knowledge to these documents.'
        )
    })
  )
  .output(conversationSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let conversation = await client.createConversation({
      name: ctx.input.name,
      botId: ctx.input.botId,
      documentIds: ctx.input.documentIds
    });

    let focusNote = ctx.input.documentIds?.length
      ? ` with focus mode (${ctx.input.documentIds.length} document(s))`
      : '';

    return {
      output: conversation,
      message: `Created conversation **${conversation.name}**${focusNote}.`
    };
  });

export let updateConversation = SlateTool.create(spec, {
  name: 'Update Conversation',
  key: 'update_conversation',
  description: `Update a conversation's name, bot, or focus mode documents. Call list_conversations and list_bots to discover IDs.`,
  constraints: [
    'Focus mode supports up to 1,000 document IDs.',
    'Documents must exist in folders the bot has access to.'
  ]
})
  .input(
    z.object({
      conversationId: conversationIdSchema,
      name: z.string().min(1).describe('New name for the conversation'),
      botId: botIdSchema,
      documentIds: z
        .array(z.string().min(1))
        .max(1000)
        .optional()
        .describe(
          'Document IDs from list_documents for focus mode. Pass an empty array to clear the selected documents.'
        )
    })
  )
  .output(conversationSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let conversation = await client.updateConversation(ctx.input.conversationId, {
      name: ctx.input.name,
      botId: ctx.input.botId,
      documentIds: ctx.input.documentIds
    });

    return {
      output: conversation,
      message: `Updated conversation **${conversation.name}** (${conversation.conversationId}).`
    };
  });

export let deleteConversation = SlateTool.create(spec, {
  name: 'Delete Conversation',
  key: 'delete_conversation',
  description: `Permanently delete a conversation and its message history. Call list_conversations to discover conversation IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      conversationId: conversationIdSchema
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the conversation was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteConversation(ctx.input.conversationId);

    return {
      output: { success: true },
      message: `Conversation \`${ctx.input.conversationId}\` deleted successfully.`
    };
  });
