import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `Retrieve comments from Project Bubble. Filter by project, task, or subtask. Comments facilitate collaboration and can include file attachments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Filter comments by project ID'),
      taskId: z.string().optional().describe('Filter comments by task ID'),
      subtaskId: z.string().optional().describe('Filter comments by subtask ID'),
      limit: z.number().optional().describe('Maximum number of records to return (max 1000)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      comments: z
        .array(
          z.object({
            commentId: z.string().describe('Comment ID'),
            comment: z.string().describe('Comment text'),
            parentId: z.string().optional().describe('Parent comment ID (for replies)'),
            projectId: z.string().optional().describe('Associated project ID'),
            taskId: z.string().optional().describe('Associated task ID'),
            subtaskId: z.string().optional().describe('Associated subtask ID'),
            filePath: z.string().optional().describe('Attached file URL'),
            fileName: z.string().optional().describe('Attached file name'),
            userId: z.string().optional().describe('Author user ID'),
            dateCreated: z.string().optional().describe('Date the comment was created')
          })
        )
        .describe('List of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.getComments({
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId,
      subtaskId: ctx.input.subtaskId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let data = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];

    let comments = data.map((c: any) => ({
      commentId: String(c.comment_id),
      comment: c.comment || '',
      parentId: c.parent_id ? String(c.parent_id) : undefined,
      projectId: c.project_id ? String(c.project_id) : undefined,
      taskId: c.task_id ? String(c.task_id) : undefined,
      subtaskId: c.subtask_id ? String(c.subtask_id) : undefined,
      filePath: c.filepath || c.file_path || undefined,
      fileName: c.filename || c.file_name || undefined,
      userId: c.user_id ? String(c.user_id) : undefined,
      dateCreated: c.date_created || undefined
    }));

    return {
      output: { comments },
      message: `Found **${comments.length}** comment(s).`
    };
  })
  .build();
