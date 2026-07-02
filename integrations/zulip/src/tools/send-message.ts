import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to a Zulip channel (with a topic) or as a direct message to one or more users. Supports Zulip-flavored Markdown formatting.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z
        .enum(['stream', 'direct'])
        .describe(
          'Message type: "stream" for channel messages, "direct" for direct/private messages'
        ),
      to: z
        .union([z.string(), z.number(), z.array(z.number())])
        .describe(
          'For channel messages: the channel name (string) or ID (number). For direct messages: a user ID or array of user IDs'
        ),
      topic: z
        .string()
        .optional()
        .describe('Topic name (required for channel messages, ignored for direct messages)'),
      content: z.string().describe('Message content in Zulip-flavored Markdown')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('ID of the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    let result = await client.sendMessage({
      type: ctx.input.type,
      to: ctx.input.to,
      topic: ctx.input.topic,
      content: ctx.input.content
    });

    return {
      output: {
        messageId: result.id
      },
      message: `Message sent successfully (ID: ${result.id})`
    };
  })
  .build();
