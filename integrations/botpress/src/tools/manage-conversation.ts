import { SlateTool } from 'slates';
import { z } from 'zod';
import { RuntimeClient } from '../lib/client';
import { spec } from '../spec';

export let manageConversationTool = SlateTool.create(spec, {
  name: 'Manage Conversation',
  key: 'manage_conversation',
  description: `Create, retrieve, or list conversations for a bot. Conversations represent exchanges between users and a bot within an integration channel. Use **get-or-create** to idempotently ensure a conversation exists.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'get-or-create', 'list'])
        .describe('Operation to perform'),
      botId: z.string().optional().describe('Bot ID. Falls back to config botId.'),
      conversationId: z.string().optional().describe('Conversation ID (required for get)'),
      channel: z
        .string()
        .optional()
        .describe('Channel name for the conversation (required for create and get-or-create)'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Tags to associate with the conversation'),
      nextToken: z.string().optional().describe('Pagination token for list')
    })
  )
  .output(
    z.object({
      conversation: z
        .object({
          conversationId: z.string(),
          channel: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string(),
          tags: z.record(z.string(), z.string()).optional()
        })
        .optional(),
      conversations: z
        .array(
          z.object({
            conversationId: z.string(),
            channel: z.string().optional(),
            createdAt: z.string(),
            updatedAt: z.string()
          })
        )
        .optional(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = ctx.input.botId || ctx.config.botId;
    if (!botId) throw new Error('botId is required (provide in input or config)');

    let client = new RuntimeClient({ token: ctx.auth.token, botId });

    if (ctx.input.action === 'list') {
      let result = await client.listConversations({ nextToken: ctx.input.nextToken });
      let conversations = (result.conversations || []).map((c: Record<string, unknown>) => ({
        conversationId: c.id as string,
        channel: c.channel as string | undefined,
        createdAt: c.createdAt as string,
        updatedAt: c.updatedAt as string
      }));
      return {
        output: { conversations, nextToken: result.meta?.nextToken },
        message: `Found **${conversations.length}** conversation(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.conversationId)
        throw new Error('conversationId is required for get action');
      let result = await client.getConversation(ctx.input.conversationId);
      let c = result.conversation;
      return {
        output: {
          conversation: {
            conversationId: c.id,
            channel: c.channel,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            tags: c.tags
          }
        },
        message: `Retrieved conversation **${c.id}**.`
      };
    }

    if (ctx.input.action === 'create' || ctx.input.action === 'get-or-create') {
      if (!ctx.input.channel)
        throw new Error('channel is required for create / get-or-create');
      let fn =
        ctx.input.action === 'create'
          ? client.createConversation.bind(client)
          : client.getOrCreateConversation.bind(client);
      let result = await fn({ channel: ctx.input.channel, tags: ctx.input.tags });
      let c = result.conversation;
      return {
        output: {
          conversation: {
            conversationId: c.id,
            channel: c.channel,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            tags: c.tags
          }
        },
        message: `${ctx.input.action === 'create' ? 'Created' : 'Got or created'} conversation **${c.id}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
