import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ListParams } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().describe('Unique comment identifier'),
  body: z.string().describe('Comment body (Markdown)'),
  taskId: z.string().describe('Task the comment belongs to'),
  authorId: z.string().describe('ID of the comment author'),
  createdAt: z.number().optional().describe('Creation timestamp'),
  editedAt: z.number().nullable().optional().describe('Last edit timestamp'),
  isPinned: z.boolean().optional().describe('Whether the comment is pinned'),
  isDeleted: z.boolean().optional().describe('Whether the comment has been soft-deleted'),
  isTeam: z.boolean().optional().describe('Whether this is a team comment')
});

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `Retrieve comments for a task in Nozbe Teams. Comments are rendered in Markdown format. Results can be sorted and paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to get comments for'),
      sortBy: z
        .string()
        .optional()
        .describe('Sort fields, e.g. "-created_at" for newest first'),
      limit: z.number().optional().describe('Maximum number of comments to return'),
      offset: z.number().optional().describe('Number of comments to skip')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema).describe('List of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: ListParams = {
      task_id: ctx.input.taskId
    };
    if (ctx.input.sortBy) params.sortBy = ctx.input.sortBy;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let comments = await client.listComments(params);

    let mapped = comments.map((c: any) => ({
      commentId: c.id,
      body: c.body,
      taskId: c.task_id,
      authorId: c.author_id,
      createdAt: c.created_at,
      editedAt: c.edited_at,
      isPinned: c.is_pinned,
      isDeleted: c.is_deleted,
      isTeam: c.is_team
    }));

    return {
      output: { comments: mapped },
      message: `Found **${mapped.length}** comment(s) on task ${ctx.input.taskId}.`
    };
  })
  .build();
