import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let conversationSchema = z.object({
  conversationId: z.string().describe('Unique conversation identifier'),
  name: z.string().describe('Conversation name'),
  botId: z.string().describe('ID of the associated bot'),
  createdAt: z.number().describe('Unix timestamp of creation in seconds')
});

let paginationSchema = z.object({
  count: z.number(),
  total: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
  nextPage: z.number().nullable(),
  previousPage: z.number().nullable()
});

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
      botId: z.string().optional().describe('Filter conversations by bot ID'),
      keyword: z.string().optional().describe('Search conversations by partial name match'),
      page: z.number().optional().describe('Page number for pagination')
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
  description: `Retrieve details of a specific conversation by its ID.`,
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
    let client = new Client({ token: ctx.auth.token });

    let conversation = await client.getConversation(ctx.input.conversationId);

    return {
      output: conversation,
      message: `Retrieved conversation **${conversation.name}** with bot \`${conversation.botId}\`.`
    };
  });

export let createConversation = SlateTool.create(spec, {
  name: 'Create Conversation',
  key: 'create_conversation',
  description: `Start a new conversation with an AI bot. Optionally enable focus mode by specifying document IDs to restrict the bot's knowledge to only those documents.`,
  constraints: [
    'Focus mode supports up to 1,000 document IDs.',
    'Documents must exist in folders the bot has access to.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name for the conversation'),
      botId: z.string().describe('ID of the bot to associate with this conversation'),
      documentIds: z
        .array(z.string())
        .optional()
        .describe('Document IDs for focus mode (limits bot knowledge to these documents)')
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
  description: `Update an existing conversation's name, associated bot, or focus mode documents.`,
  constraints: [
    'Focus mode supports up to 1,000 document IDs.',
    'Documents must exist in folders the bot has access to.'
  ]
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to update'),
      name: z.string().describe('New name for the conversation'),
      botId: z.string().describe('ID of the bot to associate'),
      documentIds: z
        .array(z.string())
        .optional()
        .describe('Document IDs for focus mode (limits bot knowledge to these documents)')
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
  description: `Permanently delete a conversation and its message history.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to delete')
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
