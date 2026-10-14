import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageThread = SlateTool.create(spec, {
  name: 'Manage Thread',
  key: 'manage_thread',
  description: `Create, retrieve, list, or delete conversation threads. Retrieving a thread includes its message history and owner information. Threads contain chat messages that feed into the user's knowledge graph.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('The operation to perform'),
      threadId: z.string().optional().describe('Thread ID (required for create, get, delete)'),
      userId: z
        .string()
        .optional()
        .describe('User ID that owns the thread (required for create)'),
      pageNumber: z.number().optional().describe('Page number for listing (starts at 1)'),
      pageSize: z.number().optional().describe('Number of threads per page'),
      orderBy: z
        .enum(['created_at', 'updated_at', 'user_id', 'thread_id'])
        .optional()
        .describe('Field to order results by'),
      ascending: z.boolean().optional().describe('Whether to sort in ascending order'),
      messageLimit: z.number().optional().describe('Message page size for get'),
      messageCursor: z.number().optional().describe('Message pagination cursor for get'),
      lastMessages: z
        .number()
        .optional()
        .describe(
          'Return the most recent messages for get; overrides messageLimit and messageCursor'
        )
    })
  )
  .output(
    z.object({
      thread: z
        .object({
          threadId: z.string().describe('Thread ID'),
          userId: z.string().optional().nullable().describe('Owner user ID'),
          uuid: z.string().optional().nullable().describe('Zep internal UUID'),
          createdAt: z.string().optional().nullable().describe('Creation timestamp')
        })
        .optional()
        .describe('Single thread result'),
      threads: z
        .array(
          z.object({
            threadId: z.string().describe('Thread ID'),
            userId: z.string().optional().nullable().describe('Owner user ID'),
            uuid: z.string().optional().nullable().describe('Zep internal UUID'),
            createdAt: z.string().optional().nullable().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of threads'),
      totalCount: z.number().optional().describe('Total number of threads available'),
      messages: z
        .array(
          z.object({
            role: z.string().describe('Message sender role'),
            content: z.string().describe('Message content'),
            name: z.string().optional().describe('Speaker name'),
            uuid: z.string().optional().describe('Message UUID'),
            createdAt: z.string().optional().describe('Message timestamp'),
            metadata: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Message metadata'),
            processed: z
              .boolean()
              .optional()
              .describe('Whether the message has been processed')
          })
        )
        .optional()
        .describe('Message history returned by get'),
      totalMessageCount: z
        .number()
        .optional()
        .describe('Total number of messages in the thread'),
      returnedMessageCount: z.number().optional().describe('Number of messages in this page'),
      deleted: z.boolean().optional().describe('Whether the thread was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      if (!ctx.input.threadId || !ctx.input.userId) {
        throw createApiServiceError('threadId and userId are required for creating a thread');
      }
      let thread = await client.createThread({
        threadId: ctx.input.threadId,
        userId: ctx.input.userId
      });
      return {
        output: {
          thread: {
            threadId: thread.thread_id,
            userId: thread.user_id,
            uuid: thread.uuid,
            createdAt: thread.created_at
          }
        },
        message: `Created thread **${thread.thread_id}** for user **${thread.user_id}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.threadId) {
        throw createApiServiceError('threadId is required for getting a thread');
      }
      let thread = await client.getThread(ctx.input.threadId, {
        limit: ctx.input.messageLimit,
        cursor: ctx.input.messageCursor,
        lastn: ctx.input.lastMessages
      });
      return {
        output: {
          thread: {
            threadId: thread.thread_id,
            userId: thread.user_id,
            uuid: thread.uuid,
            createdAt: thread.created_at
          },
          messages: thread.messages?.map(message => ({
            role: message.role,
            content: message.content,
            name: message.name,
            uuid: message.uuid,
            createdAt: message.created_at,
            metadata: message.metadata,
            processed: message.processed
          })),
          totalMessageCount: thread.total_count,
          returnedMessageCount: thread.row_count
        },
        message: `Retrieved thread **${thread.thread_id}**.`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listThreads({
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize,
        orderBy: ctx.input.orderBy,
        asc: ctx.input.ascending
      });
      let threads = (result.threads || []).map(t => ({
        threadId: t.thread_id,
        userId: t.user_id,
        uuid: t.uuid,
        createdAt: t.created_at
      }));
      return {
        output: {
          threads,
          totalCount: result.total_count
        },
        message: `Listed **${threads.length}** threads (${result.total_count} total).`
      };
    }

    // delete
    if (!ctx.input.threadId) {
      throw createApiServiceError('threadId is required for deleting a thread');
    }
    await client.deleteThread(ctx.input.threadId);
    return {
      output: {
        deleted: true
      },
      message: `Deleted thread **${ctx.input.threadId}**.`
    };
  })
  .build();
