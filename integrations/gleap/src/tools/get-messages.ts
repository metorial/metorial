import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let getMessages = SlateTool.create(spec, {
  name: 'Get Messages',
  key: 'get_messages',
  description: `Retrieve messages and comments for a specific ticket. Returns the conversation thread including agent replies, customer messages, and internal notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The ticket ID to get messages for'),
      limit: z.number().optional().describe('Maximum number of messages to return'),
      skip: z.number().optional().describe('Number of messages to skip for pagination'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, prefix with - for descending (e.g. -createdAt)')
    })
  )
  .output(
    z.object({
      messages: z.array(z.record(z.string(), z.any())).describe('List of message objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let result = await client.getMessages({
      ticket: ctx.input.ticketId,
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      sort: ctx.input.sort
    });

    let messages = Array.isArray(result) ? result : result.messages || result.data || [];

    return {
      output: { messages },
      message: `Retrieved **${messages.length}** messages for ticket **${ctx.input.ticketId}**.`
    };
  })
  .build();
