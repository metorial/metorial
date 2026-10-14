import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let retrieveCommentTool = SlateTool.create(spec, {
  name: 'Retrieve Comment',
  key: 'retrieve_comment',
  description:
    'Retrieve a feedback comment by its Canny ID, including its author, post, images, and reply relationship.',
  tags: { readOnly: true }
})
  .input(z.object({ commentId: z.string().describe('Canny comment ID') }))
  .output(
    z.object({
      commentId: z.string().describe('Comment ID'),
      authorId: z.string().describe('Canny author ID'),
      authorName: z.string().describe('Author name'),
      postId: z.string().describe('Post ID'),
      boardId: z.string().describe('Board ID'),
      value: z.string().describe('Comment text'),
      internal: z.boolean().describe('Whether the comment is internal-only'),
      parentId: z.string().nullable().describe('Parent comment ID for replies'),
      likeCount: z.number().describe('Number of likes'),
      imageURLs: z.array(z.string()).describe('Image URLs'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let comment = await client.retrieveComment(ctx.input.commentId);
    return {
      output: {
        commentId: comment.id,
        authorId: comment.author.id,
        authorName: comment.author.name,
        postId: comment.post.id,
        boardId: comment.board.id,
        value: comment.value,
        internal: comment.internal ?? false,
        parentId: comment.parentID ?? null,
        likeCount: comment.likeCount ?? 0,
        imageURLs: comment.imageURLs ?? [],
        created: comment.created
      },
      message: `Retrieved comment **${comment.id}** on post **${comment.post.id}**.`
    };
  })
  .build();
