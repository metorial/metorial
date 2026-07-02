import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().describe('Unique comment identifier'),
  author: z.string().describe('Name of the comment author'),
  text: z.string().describe('Comment text'),
  createdAt: z.string().optional().describe('When the comment was created')
});

export let addCommentTool = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a comment to a Doodle poll. Comments are visible to all participants and can be used to share notes, preferences, or constraints related to the scheduling poll.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pollId: z.string().describe('The poll to add the comment to'),
      author: z.string().describe('Name of the comment author'),
      text: z.string().describe('The comment text')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Unique identifier of the created comment'),
      author: z.string().describe('Author of the comment'),
      text: z.string().describe('Text of the comment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let comment = await client.addComment(ctx.input.pollId, {
      author: ctx.input.author,
      text: ctx.input.text
    });

    return {
      output: {
        commentId: comment.commentId,
        author: comment.author,
        text: comment.text
      },
      message: `Added comment by **${comment.author}** to poll \`${ctx.input.pollId}\`.`
    };
  })
  .build();

export let getCommentsTool = SlateTool.create(spec, {
  name: 'Get Comments',
  key: 'get_comments',
  description: `Retrieve all comments on a Doodle poll. Returns comments in chronological order with author names and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pollId: z.string().describe('The poll to retrieve comments from')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema).describe('List of comments on the poll'),
      totalCount: z.number().describe('Total number of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let comments = await client.getComments(ctx.input.pollId);

    return {
      output: {
        comments,
        totalCount: comments.length
      },
      message: `Found **${comments.length}** comment(s) on poll \`${ctx.input.pollId}\`.`
    };
  })
  .build();
