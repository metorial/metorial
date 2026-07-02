import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Creates a comment on an existing thread. Content can be plain text or rich text (HTML). When rich text is provided, plain text is ignored.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread to comment on'),
      text: z.string().optional().describe('Plain text content of the comment'),
      richText: z
        .string()
        .optional()
        .describe(
          'HTML content of the comment. Supported tags: p, a, b, h1, h2, h3, ul, li, br'
        ),
      userId: z
        .string()
        .optional()
        .describe('User ID to post as. If not provided, the API key owner is used.')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the created comment'),
      threadId: z.string().describe('Thread ID the comment was added to'),
      createdAt: z.string().describe('Timestamp when the comment was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let comment = await client.createComment({
      threadId: ctx.input.threadId,
      text: ctx.input.text,
      richText: ctx.input.richText,
      userId: ctx.input.userId
    });

    return {
      output: {
        commentId: comment.id,
        threadId: comment.threadId,
        createdAt: comment.createdAt
      },
      message: `Created comment on thread **${ctx.input.threadId}**.`
    };
  })
  .build();
