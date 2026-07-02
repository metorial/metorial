import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { airtableServiceError } from '../lib/errors';
import { spec } from '../spec';
import { baseIdInput } from './base-id';

export let manageCommentTool = SlateTool.create(spec, {
  name: 'Manage Comment',
  key: 'manage_comment',
  description: `List, create, update, or delete comments on a record in the specified Airtable base. Use this to read the conversation thread on a record or add new comments.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      baseId: baseIdInput,
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The comment action to perform'),
      tableIdOrName: z.string().describe('Table ID or table name'),
      recordId: z.string().describe('Record ID to manage comments on'),
      commentId: z.string().optional().describe('Comment ID (required for update and delete)'),
      text: z.string().optional().describe('Comment text (required for create and update)'),
      offset: z.string().optional().describe('Pagination offset for listing comments')
    })
  )
  .output(
    z.object({
      comments: z
        .array(
          z.object({
            commentId: z.string().describe('Comment ID'),
            text: z.string().describe('Comment text'),
            authorId: z.string().describe('Author user ID'),
            authorEmail: z.string().describe('Author email'),
            authorName: z.string().optional().describe('Author display name'),
            createdTime: z.string().describe('Comment creation timestamp')
          })
        )
        .optional()
        .describe('List of comments (returned for list action)'),
      comment: z
        .object({
          commentId: z.string().describe('Comment ID'),
          text: z.string().describe('Comment text'),
          authorId: z.string().describe('Author user ID'),
          authorEmail: z.string().describe('Author email'),
          authorName: z.string().optional().describe('Author display name'),
          createdTime: z.string().describe('Comment creation timestamp')
        })
        .optional()
        .describe('The created or updated comment'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the comment was deleted (returned for delete action)'),
      offset: z
        .string()
        .optional()
        .describe('Pagination offset for the next page (returned for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseId: ctx.input.baseId
    });

    let mapComment = (c: any) => ({
      commentId: c.id,
      text: c.text,
      authorId: c.author.id,
      authorEmail: c.author.email,
      authorName: c.author.name,
      createdTime: c.createdTime
    });

    if (ctx.input.action === 'list') {
      let result = await client.listComments(ctx.input.tableIdOrName, ctx.input.recordId, {
        offset: ctx.input.offset
      });

      return {
        output: {
          comments: result.comments.map(mapComment),
          ...(typeof result.offset === 'string' ? { offset: result.offset } : {})
        },
        message: `Retrieved ${result.comments.length} comment(s) on record **${ctx.input.recordId}**.${result.offset ? ' More comments available.' : ''}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.text) {
        throw airtableServiceError('text is required to create a comment');
      }

      let result = await client.createComment(
        ctx.input.tableIdOrName,
        ctx.input.recordId,
        ctx.input.text
      );

      return {
        output: {
          comment: mapComment(result)
        },
        message: `Created comment on record **${ctx.input.recordId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.commentId) {
        throw airtableServiceError('commentId is required to update a comment');
      }
      if (!ctx.input.text) {
        throw airtableServiceError('text is required to update a comment');
      }

      let result = await client.updateComment(
        ctx.input.tableIdOrName,
        ctx.input.recordId,
        ctx.input.commentId,
        ctx.input.text
      );

      return {
        output: {
          comment: mapComment(result)
        },
        message: `Updated comment **${ctx.input.commentId}** on record **${ctx.input.recordId}**.`
      };
    }

    // delete
    if (!ctx.input.commentId) {
      throw airtableServiceError('commentId is required to delete a comment');
    }

    await client.deleteComment(
      ctx.input.tableIdOrName,
      ctx.input.recordId,
      ctx.input.commentId
    );

    return {
      output: {
        deleted: true
      },
      message: `Deleted comment **${ctx.input.commentId}** from record **${ctx.input.recordId}**.`
    };
  })
  .build();
