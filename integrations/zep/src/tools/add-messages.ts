import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addMessages = SlateTool.create(spec, {
  name: 'Add Messages',
  key: 'add_messages',
  description: `Add one or more chat messages to a thread. Messages are stored in thread history and automatically processed into the user's knowledge graph. Supports batch mode for concurrent processing of large message sets.`,
  instructions: [
    'Batch mode queues messages for asynchronous processing. The batch endpoint remains available for existing workflows but is deprecated by Zep.',
    'Set returnContext to true if you need the assembled context immediately after adding messages.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread to add messages to'),
      messages: z
        .array(
          z.object({
            role: z
              .enum(['user', 'assistant', 'system', 'tool'])
              .describe('Role of the message sender'),
            content: z.string().describe('Message content text'),
            name: z.string().optional().describe('Optional speaker name for display'),
            createdAt: z
              .string()
              .optional()
              .describe('Original message timestamp in ISO 8601 format'),
            metadata: z
              .record(z.string(), z.unknown())
              .optional()
              .describe(
                'Message metadata, up to ten keys with scalar values or arrays of scalars'
              )
          })
        )
        .min(1)
        .describe('Array of messages to add'),
      ignoreRoles: z
        .array(z.string())
        .optional()
        .describe('Roles to exclude from graph ingestion'),
      returnContext: z
        .boolean()
        .optional()
        .describe('Whether to return assembled context in the response'),
      batch: z
        .boolean()
        .optional()
        .describe('Use the legacy batch endpoint for asynchronous processing of messages'),
      strictOntology: z
        .boolean()
        .optional()
        .describe('Only extract entities matching the configured ontology')
    })
  )
  .output(
    z.object({
      context: z
        .string()
        .optional()
        .nullable()
        .describe('Assembled context if returnContext was true'),
      messageCount: z.number().describe('Number of messages added'),
      messageUuids: z
        .array(z.string())
        .optional()
        .describe('UUIDs assigned to stored messages'),
      taskId: z
        .string()
        .optional()
        .describe('Task ID for asynchronous processing, when returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let params = {
      messages: ctx.input.messages.map(message => ({
        role: message.role,
        content: message.content,
        name: message.name,
        created_at: message.createdAt,
        metadata: message.metadata
      })),
      ignoreRoles: ctx.input.ignoreRoles,
      returnContext: ctx.input.returnContext,
      strictOntology: ctx.input.strictOntology
    };

    let result = ctx.input.batch
      ? await client.addMessagesBatch(ctx.input.threadId, params)
      : await client.addMessages(ctx.input.threadId, params);

    return {
      output: {
        context: result?.context,
        messageCount: ctx.input.messages.length,
        messageUuids: result.message_uuids,
        taskId: result.task_id
      },
      message: `${ctx.input.batch ? 'Queued' : 'Added'} **${ctx.input.messages.length}** message(s) for thread **${ctx.input.threadId}**${ctx.input.batch ? ' (batch mode)' : ''}.`
    };
  })
  .build();
