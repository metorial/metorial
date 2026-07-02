import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMessage = SlateTool.create(spec, {
  name: 'Manage Message',
  key: 'manage_message',
  description: `Create, retrieve, update, delete, or list messages within a conversation thread. Messages represent input/output pairs in the conversation memory, used by Assistants and Structures for multi-turn context.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      threadId: z.string().optional().describe('Thread ID (required for create and list)'),
      messageId: z
        .string()
        .optional()
        .describe('Message ID (required for get, update, delete)'),
      input: z.string().optional().describe('User input text (for create/update)'),
      output: z.string().optional().describe('Assistant output text (for create/update)'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Page size (for list)')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the message'),
      threadId: z.string().optional().describe('ID of the thread'),
      index: z.number().optional().describe('Message index in the thread'),
      input: z.string().optional().describe('User input text'),
      output: z.string().optional().describe('Assistant output text'),
      metadata: z.record(z.string(), z.any()).optional().describe('Message metadata'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the message was deleted'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Message ID'),
            index: z.number().optional().describe('Message index'),
            input: z.string().describe('User input'),
            output: z.string().describe('Assistant output'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of messages (for list action)'),
      totalCount: z.number().optional().describe('Total messages count (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      if (!ctx.input.threadId) throw new Error('threadId is required for create');
      if (!ctx.input.input) throw new Error('input is required for create');
      if (!ctx.input.output) throw new Error('output is required for create');
      let result = await client.createMessage(ctx.input.threadId, {
        input: ctx.input.input,
        output: ctx.input.output,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          messageId: result.message_id,
          threadId: result.thread_id,
          index: result.index,
          input: result.input,
          output: result.output,
          metadata: result.metadata,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Created message in thread ${result.thread_id}.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.messageId) throw new Error('messageId is required for get');
      let result = await client.getMessage(ctx.input.messageId);
      return {
        output: {
          messageId: result.message_id,
          threadId: result.thread_id,
          index: result.index,
          input: result.input,
          output: result.output,
          metadata: result.metadata,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Retrieved message ${result.message_id}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.messageId) throw new Error('messageId is required for update');
      let result = await client.updateMessage(ctx.input.messageId, {
        input: ctx.input.input,
        output: ctx.input.output,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          messageId: result.message_id,
          threadId: result.thread_id,
          index: result.index,
          input: result.input,
          output: result.output,
          metadata: result.metadata,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Updated message ${result.message_id}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.messageId) throw new Error('messageId is required for delete');
      await client.deleteMessage(ctx.input.messageId);
      return {
        output: { messageId: ctx.input.messageId, deleted: true },
        message: `Deleted message ${ctx.input.messageId}.`
      };
    }

    if (ctx.input.action === 'list') {
      if (!ctx.input.threadId) throw new Error('threadId is required for list');
      let result = await client.listMessages(ctx.input.threadId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let messages = result.items.map((m: any) => ({
        messageId: m.message_id,
        index: m.index,
        input: m.input,
        output: m.output,
        createdAt: m.created_at
      }));
      return {
        output: { messages, totalCount: result.pagination.totalCount },
        message: `Found **${result.pagination.totalCount}** message(s) in thread ${ctx.input.threadId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
