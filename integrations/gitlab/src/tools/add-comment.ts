import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let addComment = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a comment (note) to an issue or merge request. Supports Markdown formatting. Can also list existing comments on an issue or merge request.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list'])
        .describe('Create a new comment or list existing comments'),
      projectId: z.string().describe('Project ID or URL-encoded path'),
      targetType: z
        .enum(['issue', 'merge_request'])
        .describe('Whether to comment on an issue or merge request'),
      targetIid: z.number().describe('IID of the issue or merge request'),
      body: z
        .string()
        .optional()
        .describe('Comment body (Markdown supported, required for create)'),
      confidential: z
        .boolean()
        .optional()
        .describe('Whether the comment is confidential (issues only)'),
      orderBy: z
        .enum(['created_at', 'updated_at'])
        .optional()
        .describe('Order comments by field (list only)'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort direction (list only)'),
      perPage: z.number().optional().describe('Results per page (list only)'),
      page: z.number().optional().describe('Page number (list only)')
    })
  )
  .output(
    z.object({
      comment: z
        .object({
          noteId: z.number().describe('Comment ID'),
          body: z.string().describe('Comment body'),
          authorUsername: z.string().describe('Author username'),
          createdAt: z.string().describe('Creation timestamp'),
          system: z.boolean().describe('Whether this is a system-generated note')
        })
        .optional()
        .describe('Created comment'),
      comments: z
        .array(
          z.object({
            noteId: z.number().describe('Comment ID'),
            body: z.string().describe('Comment body'),
            authorUsername: z.string().describe('Author username'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Update timestamp'),
            system: z.boolean().describe('Whether this is a system-generated note')
          })
        )
        .optional()
        .describe('List of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    if (ctx.input.action === 'list') {
      let notes: any[];
      if (ctx.input.targetType === 'issue') {
        notes = await client.listIssueNotes(ctx.input.projectId, ctx.input.targetIid, {
          orderBy: ctx.input.orderBy,
          sort: ctx.input.sort,
          perPage: ctx.input.perPage,
          page: ctx.input.page
        });
      } else {
        notes = await client.listMergeRequestNotes(ctx.input.projectId, ctx.input.targetIid, {
          orderBy: ctx.input.orderBy,
          sort: ctx.input.sort,
          perPage: ctx.input.perPage,
          page: ctx.input.page
        });
      }

      let comments = notes.map((n: any) => ({
        noteId: n.id,
        body: n.body,
        authorUsername: n.author?.username || 'unknown',
        createdAt: n.created_at,
        updatedAt: n.updated_at,
        system: n.system || false
      }));

      return {
        output: { comments },
        message: `Found **${comments.length}** comments on ${ctx.input.targetType === 'issue' ? 'issue' : 'MR'} **#${ctx.input.targetIid}**`
      };
    }

    if (!ctx.input.body) throw gitLabServiceError('Comment body is required');

    let note: any;
    if (ctx.input.targetType === 'issue') {
      note = await client.createIssueNote(
        ctx.input.projectId,
        ctx.input.targetIid,
        ctx.input.body,
        ctx.input.confidential
      );
    } else {
      note = await client.createMergeRequestNote(
        ctx.input.projectId,
        ctx.input.targetIid,
        ctx.input.body
      );
    }

    return {
      output: {
        comment: {
          noteId: note.id,
          body: note.body,
          authorUsername: note.author?.username || 'unknown',
          createdAt: note.created_at,
          system: note.system || false
        }
      },
      message: `Added comment to ${ctx.input.targetType === 'issue' ? 'issue' : 'MR'} **#${ctx.input.targetIid}**`
    };
  })
  .build();
