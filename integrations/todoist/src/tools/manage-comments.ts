import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().describe('Comment ID'),
  content: z.string().describe('Comment content (markdown)'),
  postedAt: z.string().describe('Timestamp when comment was posted'),
  taskId: z.string().nullable().describe('Associated task ID'),
  projectId: z.string().nullable().describe('Associated project ID'),
  attachment: z
    .object({
      fileName: z.string(),
      fileType: z.string(),
      fileUrl: z.string(),
      resourceType: z.string()
    })
    .nullable()
    .describe('File attachment')
});

export let getComments = SlateTool.create(spec, {
  name: 'Get Comments',
  key: 'get_comments',
  description: `Retrieve comments on a task or project. Provide either a taskId or projectId.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Task ID to get comments for'),
      projectId: z.string().optional().describe('Project ID to get comments for'),
      commentId: z.string().optional().describe('Specific comment ID to retrieve')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema).describe('Retrieved comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.commentId) {
      let comment = await client.getComment(ctx.input.commentId);
      return {
        output: { comments: [comment] },
        message: `Retrieved comment (ID: ${comment.commentId}).`
      };
    }

    let comments = await client.getComments({
      taskId: ctx.input.taskId,
      projectId: ctx.input.projectId
    });

    return {
      output: { comments },
      message: `Retrieved **${comments.length}** comment(s).`
    };
  });

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Add a comment to a task or project. Supports markdown formatting. Provide either a taskId or projectId.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      content: z.string().describe('Comment content (supports markdown)'),
      taskId: z.string().optional().describe('Task ID to comment on'),
      projectId: z.string().optional().describe('Project ID to comment on')
    })
  )
  .output(commentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let comment = await client.createComment(ctx.input);

    return {
      output: comment,
      message: `Added comment (ID: ${comment.commentId}) to ${comment.taskId ? 'task' : 'project'}.`
    };
  });

export let updateComment = SlateTool.create(spec, {
  name: 'Update Comment',
  key: 'update_comment',
  description: `Update the content of an existing comment.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      commentId: z.string().describe('Comment ID to update'),
      content: z.string().describe('New comment content (supports markdown)')
    })
  )
  .output(commentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let comment = await client.updateComment(ctx.input.commentId, {
      content: ctx.input.content
    });

    return {
      output: comment,
      message: `Updated comment (ID: ${comment.commentId}).`
    };
  });

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment from a task or project.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      commentId: z.string().describe('Comment ID to delete')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Deleted comment ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteComment(ctx.input.commentId);

    return {
      output: { commentId: ctx.input.commentId },
      message: `Deleted comment (ID: ${ctx.input.commentId}).`
    };
  });
