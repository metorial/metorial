import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageThread = SlateTool.create(spec, {
  name: 'Manage Thread',
  key: 'manage_thread',
  description: `Create, update, retrieve, list, or delete conversation threads in Griptape Cloud. Threads maintain conversation state and context for Assistants and Structures, enabling multi-turn interactions.`,
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
      threadId: z.string().optional().describe('Thread ID (required for get, update, delete)'),
      name: z.string().optional().describe('Thread name (required for create)'),
      alias: z.string().optional().describe('Thread alias for easy reference'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Page size (for list)'),
      startsWith: z.string().optional().describe('Filter threads by name prefix (for list)'),
      createdBy: z.string().optional().describe('Filter threads by creator (for list)')
    })
  )
  .output(
    z.object({
      threadId: z.string().optional().describe('ID of the thread'),
      name: z.string().optional().describe('Name of the thread'),
      alias: z.string().optional().describe('Alias of the thread'),
      metadata: z.record(z.string(), z.any()).optional().describe('Thread metadata'),
      messageCount: z.number().optional().describe('Number of messages in the thread'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the thread was deleted'),
      threads: z
        .array(
          z.object({
            threadId: z.string().describe('Thread ID'),
            name: z.string().describe('Thread name'),
            alias: z.string().optional().describe('Thread alias'),
            messageCount: z.number().optional().describe('Number of messages'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of threads (for list action)'),
      totalCount: z.number().optional().describe('Total threads count (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for creating a thread');
      let result = await client.createThread({
        name: ctx.input.name,
        alias: ctx.input.alias,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          threadId: result.thread_id,
          name: result.name,
          alias: result.alias,
          metadata: result.metadata,
          messageCount: result.message_count,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Created thread **${result.name}** (${result.thread_id}).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.threadId) throw new Error('threadId is required for get');
      let result = await client.getThread(ctx.input.threadId);
      return {
        output: {
          threadId: result.thread_id,
          name: result.name,
          alias: result.alias,
          metadata: result.metadata,
          messageCount: result.message_count,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Retrieved thread **${result.name}** with ${result.message_count} message(s).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.threadId) throw new Error('threadId is required for update');
      let result = await client.updateThread(ctx.input.threadId, {
        name: ctx.input.name,
        alias: ctx.input.alias,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          threadId: result.thread_id,
          name: result.name,
          alias: result.alias,
          metadata: result.metadata,
          messageCount: result.message_count,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Updated thread **${result.name}** (${result.thread_id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.threadId) throw new Error('threadId is required for delete');
      await client.deleteThread(ctx.input.threadId);
      return {
        output: { threadId: ctx.input.threadId, deleted: true },
        message: `Deleted thread ${ctx.input.threadId}.`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listThreads({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        alias: ctx.input.alias,
        startsWith: ctx.input.startsWith,
        createdBy: ctx.input.createdBy
      });
      let threads = result.items.map((t: any) => ({
        threadId: t.thread_id,
        name: t.name,
        alias: t.alias,
        messageCount: t.message_count,
        createdAt: t.created_at
      }));
      return {
        output: { threads, totalCount: result.pagination.totalCount },
        message: `Found **${result.pagination.totalCount}** thread(s).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
