import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createThread = SlateTool.create(spec, {
  name: 'Create Thread',
  key: 'create_thread',
  description: `Creates a new thread in a specific channel. Content can be plain text or rich text (HTML). When rich text is provided, plain text is ignored. Supported HTML tags: p, a, b, h1, h2, h3, ul, li, br.`,
  instructions: [
    'Either text or richText should be provided. If richText is set, text is ignored.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to create the thread in'),
      title: z.string().optional().describe('Title of the thread'),
      text: z.string().optional().describe('Plain text content of the thread'),
      richText: z
        .string()
        .optional()
        .describe(
          'HTML content of the thread. Supported tags: p, a, b, h1, h2, h3, ul, li, br'
        ),
      userId: z
        .string()
        .optional()
        .describe('User ID to post as. If not provided, the API key owner is used.')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('ID of the created thread'),
      channelId: z.string().describe('Channel ID where the thread was created'),
      createdAt: z.string().describe('Timestamp when the thread was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let thread = await client.createThread({
      channelId: ctx.input.channelId,
      title: ctx.input.title,
      text: ctx.input.text,
      richText: ctx.input.richText,
      userId: ctx.input.userId
    });

    return {
      output: {
        threadId: thread.id,
        channelId: thread.channelId,
        createdAt: thread.createdAt
      },
      message: `Created thread${ctx.input.title ? ` **${ctx.input.title}**` : ''} in channel **${ctx.input.channelId}**.`
    };
  })
  .build();
