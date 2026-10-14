import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description:
    'Post a Markdown or HTML comment to an existing discussion as the API-key user.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      discussionId: z
        .number()
        .int()
        .positive()
        .describe('Discussion ID returned by get_discussion or list_discussions'),
      body: z.string().min(1).describe('Comment text'),
      bodyFormat: z.enum(['md', 'html']).default('md').describe('Format of the comment text')
    })
  )
  .output(
    z.object({
      commentId: z.number(),
      discussionId: z.number(),
      body: z.string().optional(),
      bodyFormat: z.string().optional(),
      authorId: z.number().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let comment = await client.createComment(ctx.input);
    return {
      output: {
        commentId: comment.id,
        discussionId: comment.discussion_id ?? ctx.input.discussionId,
        body: comment.body ?? undefined,
        bodyFormat: comment.body_format ?? undefined,
        authorId: comment.author_id ?? undefined,
        createdAt: comment.created_at ?? undefined
      },
      message: `Created comment ${comment.id} in discussion ${ctx.input.discussionId}.`
    };
  })
  .build();
