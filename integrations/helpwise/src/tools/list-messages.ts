import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Retrieve all messages within a specific conversation. Returns the full email thread including sender, recipients, body, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox containing the conversation'),
      conversationId: z
        .string()
        .describe('ID of the conversation/thread to retrieve messages from'),
      limit: z.number().optional().describe('Maximum number of messages to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      messages: z
        .array(z.record(z.string(), z.any()))
        .describe('List of messages in the conversation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMessages({
      mailbox_id: ctx.input.mailboxId,
      thread_id: ctx.input.conversationId,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let messages = Array.isArray(result)
      ? result
      : (result.messages ?? result.emails ?? result.data ?? []);

    return {
      output: { messages },
      message: `Retrieved ${messages.length} message(s) from conversation **${ctx.input.conversationId}**.`
    };
  })
  .build();
