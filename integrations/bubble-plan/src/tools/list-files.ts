import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `Retrieve files shared within projects, tasks, or subtasks. Files are stored as comments, so file deletion is handled through the comment deletion tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Filter files by project ID'),
      taskId: z.string().optional().describe('Filter files by task ID'),
      subtaskId: z.string().optional().describe('Filter files by subtask ID'),
      order: z.string().optional().describe('Sort order for results'),
      limit: z.number().optional().describe('Maximum number of records to return (max 1000)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      files: z
        .array(
          z.object({
            fileHash: z.string().describe('Unique file identifier'),
            filePath: z.string().describe('CDN URL to the file'),
            fileName: z.string().describe('Original file name'),
            commentId: z.string().optional().describe('Associated comment ID'),
            projectId: z.string().optional().describe('Associated project ID'),
            taskId: z.string().optional().describe('Associated task ID'),
            subtaskId: z.string().optional().describe('Associated subtask ID'),
            userId: z.string().optional().describe('Uploader user ID'),
            dateCreated: z.string().optional().describe('Upload date')
          })
        )
        .describe('List of files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.getFiles({
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId,
      subtaskId: ctx.input.subtaskId,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let data = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];

    let files = data.map((f: any) => ({
      fileHash: f.hash || '',
      filePath: f.file_path || '',
      fileName: f.file_name || '',
      commentId: f.comment_id ? String(f.comment_id) : undefined,
      projectId: f.project_id ? String(f.project_id) : undefined,
      taskId: f.task_id ? String(f.task_id) : undefined,
      subtaskId: f.subtask_id ? String(f.subtask_id) : undefined,
      userId: f.user_id ? String(f.user_id) : undefined,
      dateCreated: f.date_created || undefined
    }));

    return {
      output: { files },
      message: `Found **${files.length}** file(s).`
    };
  })
  .build();
