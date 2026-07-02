import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addMessages = SlateTool.create(spec, {
  name: 'Add Messages',
  key: 'add_messages',
  description: `Add one or more chat messages to a thread. Messages are stored in thread history and automatically processed into the user's knowledge graph. Supports batch mode for concurrent processing of large message sets.`,
  instructions: [
    'Use batch mode for adding more than a few messages at once for better throughput.',
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
            name: z.string().optional().describe('Optional speaker name for display')
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
        .describe('Use batch mode for concurrent processing of messages')
    })
  )
  .output(
    z.object({
      context: z
        .string()
        .optional()
        .nullable()
        .describe('Assembled context if returnContext was true'),
      messageCount: z.number().describe('Number of messages added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let params = {
      messages: ctx.input.messages,
      ignoreRoles: ctx.input.ignoreRoles,
      returnContext: ctx.input.returnContext
    };

    let result: any;
    if (ctx.input.batch) {
      result = await client.addMessagesBatch(ctx.input.threadId, params);
    } else {
      result = await client.addMessages(ctx.input.threadId, params);
    }

    return {
      output: {
        context: result?.context,
        messageCount: ctx.input.messages.length
      },
      message: `Added **${ctx.input.messages.length}** message(s) to thread **${ctx.input.threadId}**${ctx.input.batch ? ' (batch mode)' : ''}.`
    };
  })
  .build();
