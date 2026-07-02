import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { redditServiceError } from '../lib/errors';
import { spec } from '../spec';

export let submitComment = SlateTool.create(spec, {
  name: 'Submit Comment',
  key: 'submit_comment',
  description: `Post a comment on a Reddit post or reply to an existing comment.
Pass a post fullname (t3_*) to comment on a post, or a comment fullname (t1_*) to reply to a comment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      parentId: z
        .string()
        .describe('Fullname of the parent post (t3_*) or comment (t1_*) to reply to'),
      text: z.string().describe('Comment text (markdown supported)')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Fullname of the created comment'),
      parentId: z.string().describe('Fullname of the parent item')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);

    let result = await client.submitComment(ctx.input.parentId, ctx.input.text);

    let commentData = result?.json?.data?.things?.[0]?.data;
    if (typeof commentData?.name !== 'string' || !commentData.name) {
      throw redditServiceError('Reddit did not return a created comment id.');
    }

    return {
      output: {
        commentId: commentData.name,
        parentId: ctx.input.parentId
      },
      message: `Comment posted as a reply to \`${ctx.input.parentId}\`.`
    };
  })
  .build();
