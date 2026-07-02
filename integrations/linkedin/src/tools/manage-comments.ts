import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinkedInClient } from '../lib/client';
import { spec } from '../spec';

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Create a comment on a LinkedIn post. Supports top-level comments and replies to existing comments.`,
  instructions: [
    'The actorUrn should be the URN of the member creating the comment, e.g. "urn:li:person:abc123".',
    'To reply to an existing comment, provide the parentCommentUrn field.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      postUrn: z.string().describe('URN of the post to comment on'),
      actorUrn: z
        .string()
        .describe('URN of the member creating the comment, e.g. "urn:li:person:abc123"'),
      text: z.string().describe('Comment text content'),
      parentCommentUrn: z
        .string()
        .optional()
        .describe('URN of the parent comment if this is a reply')
    })
  )
  .output(
    z.object({
      commentUrn: z.string().optional().describe('URN of the created comment'),
      actorUrn: z.string().describe('URN of the comment author'),
      text: z.string().describe('Comment text'),
      createdAt: z
        .number()
        .optional()
        .describe('Timestamp when the comment was created (epoch ms)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });

    let comment = await client.createComment(ctx.input.postUrn, {
      actor: ctx.input.actorUrn,
      message: { text: ctx.input.text },
      parentComment: ctx.input.parentCommentUrn
    });

    return {
      output: {
        commentUrn:
          comment.commentUrn ??
          comment.$URN ??
          (comment.object && comment.id
            ? `urn:li:comment:(${comment.object},${comment.id})`
            : undefined),
        actorUrn: comment.actor,
        text: comment.message.text,
        createdAt: comment.created?.time
      },
      message: `Created comment on post \`${ctx.input.postUrn}\`.`
    };
  })
  .build();

export let getComments = SlateTool.create(spec, {
  name: 'Get Comments',
  key: 'get_comments',
  description: `Retrieve comments on a LinkedIn post. Returns a paginated list of comments with author information and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postUrn: z.string().describe('URN of the post to get comments for'),
      count: z.number().optional().describe('Number of comments to return'),
      start: z.number().optional().describe('Pagination offset (0-based)')
    })
  )
  .output(
    z.object({
      comments: z.array(
        z.object({
          commentUrn: z.string().optional().describe('URN of the comment'),
          actorUrn: z.string().describe('URN of the comment author'),
          text: z.string().describe('Comment text'),
          createdAt: z
            .number()
            .optional()
            .describe('Timestamp when the comment was created (epoch ms)'),
          isReply: z.boolean().describe('Whether this comment is a reply to another comment')
        })
      ),
      totalCount: z.number().optional().describe('Total number of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });

    let result = await client.getComments(ctx.input.postUrn, {
      count: ctx.input.count,
      start: ctx.input.start
    });

    let comments = result.elements.map(c => ({
      commentUrn:
        c.commentUrn ??
        c.$URN ??
        (c.object && c.id ? `urn:li:comment:(${c.object},${c.id})` : undefined),
      actorUrn: c.actor,
      text: c.message.text,
      createdAt: c.created?.time,
      isReply: !!c.parentComment
    }));

    return {
      output: {
        comments,
        totalCount: result.paging?.total
      },
      message: `Retrieved **${comments.length}** comments on post \`${ctx.input.postUrn}\`.`
    };
  })
  .build();

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment from a LinkedIn post. The authenticated user must be the author of the comment.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      postUrn: z.string().describe('URN of the post the comment belongs to'),
      commentUrn: z.string().describe('Comment ID or composite URN of the comment to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the comment was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });
    await client.deleteComment(ctx.input.postUrn, ctx.input.commentUrn);

    return {
      output: { deleted: true },
      message: `Deleted comment \`${ctx.input.commentUrn}\` from post \`${ctx.input.postUrn}\`.`
    };
  })
  .build();
