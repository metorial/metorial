import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentOutputSchema = z.object({
  commentId: z.number().describe('Unique comment ID'),
  date: z.string().describe('Comment date (ISO-8601)'),
  text: z.string().describe('Comment text'),
  postTitle: z.string().describe('Title of the post this comment belongs to'),
  userId: z.string().nullable().describe('User ID of the commenter'),
  userEmail: z.string().nullable().describe('Email of the commenter'),
  userFirstName: z.string().nullable().describe('First name of the commenter'),
  userLastName: z.string().nullable().describe('Last name of the commenter')
});

export let addCommentTool = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a comment to a Beamer post or feature request. Supports both post comments and feature request comments. Optionally associate the comment with a user.`,
  instructions: [
    'Set resourceType to "post" for post comments or "feature_request" for feature request comments.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['post', 'feature_request'])
        .describe('Type of resource to comment on'),
      resourceId: z.number().describe('ID of the post or feature request'),
      text: z.string().describe('Comment text'),
      userId: z.string().optional().describe('User ID of the commenter'),
      userEmail: z.string().optional().describe('Email of the commenter'),
      userFirstname: z.string().optional().describe('First name of the commenter'),
      userLastname: z.string().optional().describe('Last name of the commenter'),
      visible: z
        .boolean()
        .optional()
        .describe('Whether the comment is publicly visible (feature requests only)')
    })
  )
  .output(commentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let comment: any;

    if (ctx.input.resourceType === 'post') {
      comment = await client.createPostComment(ctx.input.resourceId, {
        text: ctx.input.text,
        userId: ctx.input.userId,
        userEmail: ctx.input.userEmail,
        userFirstname: ctx.input.userFirstname,
        userLastname: ctx.input.userLastname
      });
    } else {
      comment = await client.createFeatureRequestComment(ctx.input.resourceId, {
        text: ctx.input.text,
        userId: ctx.input.userId,
        userEmail: ctx.input.userEmail,
        userFirstname: ctx.input.userFirstname,
        userLastname: ctx.input.userLastname,
        visible: ctx.input.visible
      });
    }

    return {
      output: {
        commentId: comment.id,
        date: comment.date,
        text: comment.text,
        postTitle: comment.postTitle,
        userId: comment.userId,
        userEmail: comment.userEmail,
        userFirstName: comment.userFirstName,
        userLastName: comment.userLastName
      },
      message: `Added comment to ${ctx.input.resourceType === 'post' ? 'post' : 'feature request'} **#${ctx.input.resourceId}**.`
    };
  })
  .build();
