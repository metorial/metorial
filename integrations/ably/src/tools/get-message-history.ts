import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyRestClient } from '../lib/client';
import { spec } from '../spec';

export let getMessageHistory = SlateTool.create(spec, {
  name: 'Get Message History',
  key: 'get_message_history',
  description: `Retrieve historical messages from an Ably channel. Messages are persisted and can be queried by time range, with pagination support. Useful for retrieving messages missed while disconnected.`,
  instructions: [
    'Requires API Key authentication with the "history" capability on the target channel.',
    'Times are specified as milliseconds since Unix epoch.'
  ],
  constraints: [
    'Maximum 1000 messages per request.',
    'Messages persist for 2 minutes by default, or 24-72 hours if persistence is enabled on the channel namespace.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('Channel name to retrieve message history from'),
      start: z
        .string()
        .optional()
        .describe('Start of time window as milliseconds since Unix epoch'),
      end: z
        .string()
        .optional()
        .describe('End of time window as milliseconds since Unix epoch'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of messages to return (default: 100, max: 1000)'),
      direction: z
        .enum(['forwards', 'backwards'])
        .optional()
        .describe(
          'Query direction: "forwards" (oldest first) or "backwards" (newest first, default)'
        )
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.string().optional().describe('Unique message identifier'),
            name: z.string().optional().describe('Event name'),
            messageData: z.any().optional().describe('Message payload'),
            clientId: z.string().optional().describe('Publisher client ID'),
            connectionId: z.string().optional().describe('Publisher connection ID'),
            timestamp: z
              .number()
              .optional()
              .describe('Message timestamp in milliseconds since epoch'),
            encoding: z.string().optional().describe('Encoding applied to the message data')
          })
        )
        .describe('List of historical messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyRestClient(ctx.auth.token);

    let messages = await client.getMessageHistory(ctx.input.channelId, {
      start: ctx.input.start,
      end: ctx.input.end,
      limit: ctx.input.limit,
      direction: ctx.input.direction
    });

    let mapped = (messages || []).map((msg: any) => ({
      messageId: msg.id,
      name: msg.name,
      messageData: msg.data,
      clientId: msg.clientId,
      connectionId: msg.connectionId,
      timestamp: msg.timestamp,
      encoding: msg.encoding
    }));

    return {
      output: { messages: mapped },
      message: `Retrieved **${mapped.length}** message(s) from channel **${ctx.input.channelId}**.`
    };
  })
  .build();
