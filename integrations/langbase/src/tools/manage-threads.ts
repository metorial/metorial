import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']).describe('Role of the message sender'),
  content: z.string().nullable().describe('Content of the message'),
  name: z.string().optional().describe('Name identifier'),
  toolCallId: z.string().optional().describe('Tool call ID for tool response messages')
});

let messageOutputSchema = z.object({
  messageId: z.string().describe('ID of the message'),
  threadId: z.string().describe('ID of the thread'),
  createdAt: z.number().describe('Creation timestamp (Unix epoch)'),
  role: z.string().describe('Role of the message sender'),
  content: z.string().nullable().describe('Content of the message'),
  name: z.string().optional().describe('Name identifier')
});

export let createThread = SlateTool.create(spec, {
  name: 'Create Thread',
  key: 'create_thread',
  description: `Create a new conversation thread in Langbase. Threads help organize and maintain conversation history across multiple interactions. You can optionally provide initial messages and a custom thread ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z
        .string()
        .optional()
        .describe('Custom thread ID. Auto-generated if not provided.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata for the thread'),
      messages: z
        .array(messageSchema)
        .optional()
        .describe('Initial messages to add to the thread')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('ID of the created thread'),
      createdAt: z.number().describe('Creation timestamp (Unix epoch)'),
      metadata: z.record(z.string(), z.any()).optional().describe('Thread metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.threadId) body.threadId = ctx.input.threadId;
    if (ctx.input.metadata) body.metadata = ctx.input.metadata;
    if (ctx.input.messages) {
      body.messages = ctx.input.messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {})
      }));
    }

    let result = await client.createThread(body);

    return {
      output: {
        threadId: result.id,
        createdAt: result.created_at,
        metadata: result.metadata
      },
      message: `Created thread \`${result.id}\`.`
    };
  })
  .build();

export let getThread = SlateTool.create(spec, {
  name: 'Get Thread',
  key: 'get_thread',
  description: `Get details of a conversation thread including its metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread to retrieve')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('ID of the thread'),
      createdAt: z.number().describe('Creation timestamp (Unix epoch)'),
      metadata: z.record(z.string(), z.any()).optional().describe('Thread metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getThread(ctx.input.threadId);

    return {
      output: {
        threadId: result.id,
        createdAt: result.created_at,
        metadata: result.metadata
      },
      message: `Retrieved thread \`${result.id}\`.`
    };
  })
  .build();

export let updateThread = SlateTool.create(spec, {
  name: 'Update Thread',
  key: 'update_thread',
  description: `Update a conversation thread's metadata.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread to update'),
      metadata: z
        .record(z.string(), z.string())
        .describe('Updated key-value metadata for the thread')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('ID of the updated thread'),
      createdAt: z.number().describe('Creation timestamp (Unix epoch)'),
      metadata: z.record(z.string(), z.any()).optional().describe('Updated thread metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.updateThread(ctx.input.threadId, {
      metadata: ctx.input.metadata
    });

    return {
      output: {
        threadId: result.id,
        createdAt: result.created_at,
        metadata: result.metadata
      },
      message: `Updated thread \`${result.id}\`.`
    };
  })
  .build();

export let deleteThread = SlateTool.create(spec, {
  name: 'Delete Thread',
  key: 'delete_thread',
  description: `Delete a conversation thread and all its messages. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.deleteThread(ctx.input.threadId);

    return {
      output: {
        success: result.success ?? true
      },
      message: `Deleted thread \`${ctx.input.threadId}\`.`
    };
  })
  .build();

export let appendMessages = SlateTool.create(spec, {
  name: 'Append Messages',
  key: 'append_messages',
  description: `Append one or more messages to an existing conversation thread. Use this to add user, assistant, system, or tool messages to maintain conversation history.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread to append messages to'),
      messages: z.array(messageSchema).describe('Messages to append to the thread')
    })
  )
  .output(
    z.object({
      messages: z
        .array(messageOutputSchema)
        .describe('The appended messages with their assigned IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body = {
      messages: ctx.input.messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {})
      }))
    };

    let result = await client.appendMessages(ctx.input.threadId, body);
    let msgs = (Array.isArray(result) ? result : []).map((m: any) => ({
      messageId: m.id ?? '',
      threadId: m.thread_id ?? ctx.input.threadId,
      createdAt: m.created_at ?? 0,
      role: m.role ?? '',
      content: m.content,
      name: m.name ?? undefined
    }));

    return {
      output: { messages: msgs },
      message: `Appended **${msgs.length}** message(s) to thread \`${ctx.input.threadId}\`.`
    };
  })
  .build();

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `List all messages in a conversation thread in chronological order (oldest first). Returns the full conversation history including roles, content, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread to list messages from')
    })
  )
  .output(
    z.object({
      messages: z.array(messageOutputSchema).describe('Messages in the thread')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listMessages(ctx.input.threadId);

    let msgs = (Array.isArray(result) ? result : []).map((m: any) => ({
      messageId: m.id ?? '',
      threadId: m.thread_id ?? ctx.input.threadId,
      createdAt: m.created_at ?? 0,
      role: m.role ?? '',
      content: m.content,
      name: m.name ?? undefined
    }));

    return {
      output: { messages: msgs },
      message: `Found **${msgs.length}** message(s) in thread \`${ctx.input.threadId}\`.`
    };
  })
  .build();
