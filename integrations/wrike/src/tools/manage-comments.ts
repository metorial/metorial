import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List comments on a task or folder/project. Returns comment text, author, and creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Task ID to list comments from'),
      folderId: z.string().optional().describe('Folder/project ID to list comments from'),
      limit: z.number().optional().describe('Maximum number of comments to return'),
      plainText: z.boolean().optional().describe('If true, return plain text instead of HTML')
    })
  )
  .output(
    z.object({
      comments: z.array(
        z.object({
          commentId: z.string(),
          authorId: z.string(),
          text: z.string(),
          createdDate: z.string(),
          taskId: z.string().optional(),
          folderId: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let result = await client.getComments({
      taskId: ctx.input.taskId,
      folderId: ctx.input.folderId,
      limit: ctx.input.limit,
      plainText: ctx.input.plainText
    });

    let comments = result.data.map(c => ({
      commentId: c.id,
      authorId: c.authorId,
      text: c.text,
      createdDate: c.createdDate,
      taskId: c.taskId,
      folderId: c.folderId
    }));

    return {
      output: { comments, count: comments.length },
      message: `Found **${comments.length}** comment(s).`
    };
  })
  .build();

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Add a comment to a task or folder/project. Supports HTML or plain text content.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Task ID to add the comment to'),
      folderId: z.string().optional().describe('Folder/project ID to add the comment to'),
      text: z.string().describe('Comment text (HTML or plain text)'),
      plainText: z.boolean().optional().describe('If true, text is treated as plain text')
    })
  )
  .output(
    z.object({
      commentId: z.string(),
      authorId: z.string(),
      text: z.string(),
      createdDate: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let comment = await client.createComment({
      taskId: ctx.input.taskId,
      folderId: ctx.input.folderId,
      text: ctx.input.text,
      plainText: ctx.input.plainText
    });

    return {
      output: {
        commentId: comment.id,
        authorId: comment.authorId,
        text: comment.text,
        createdDate: comment.createdDate
      },
      message: `Created comment ${comment.id}.`
    };
  })
  .build();

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment from a task or folder/project.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      commentId: z.string().describe('ID of the comment to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    await client.deleteComment(ctx.input.commentId);

    return {
      output: { deleted: true },
      message: `Deleted comment ${ctx.input.commentId}.`
    };
  })
  .build();
