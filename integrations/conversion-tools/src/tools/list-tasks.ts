import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskDetailSchema = z.object({
  taskId: z.string().describe('The task ID'),
  conversionType: z.string().describe('The conversion type (e.g. convert.pdf_to_word)'),
  status: z.string().describe('Current status: PENDING, RUNNING, SUCCESS, or ERROR'),
  errorMessage: z.string().nullable().describe('Error message if the task failed'),
  dateCreated: z.string().describe('ISO timestamp when the task was created'),
  dateFinished: z.string().nullable().describe('ISO timestamp when the task finished'),
  conversionProgress: z.number().describe('Progress percentage (0-100)'),
  sourceFileName: z.string().describe('Name of the source file'),
  sourceFileSize: z.number().describe('Size of the source file in bytes'),
  resultFileName: z.string().nullable().describe('Name of the result file'),
  resultFileId: z.string().nullable().describe('File ID of the result file'),
  retentionMode: z.string().describe('File retention mode (standard_24h or ttl_15m)'),
  dateExpires: z.string().nullable().describe('ISO timestamp when the task files expire')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Lists up to 50 most recent conversion tasks. Optionally filter by status to find pending, running, successful, or failed tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['PENDING', 'RUNNING', 'SUCCESS', 'ERROR'])
        .optional()
        .describe('Filter tasks by status')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskDetailSchema).describe('List of conversion tasks'),
      totalCount: z.number().describe('Number of tasks returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let tasks = await client.listTasks(ctx.input.status);

    let mappedTasks = tasks.map(t => ({
      taskId: t.id,
      conversionType: t.type,
      status: t.status,
      errorMessage: t.error,
      dateCreated: t.dateCreated,
      dateFinished: t.dateFinished,
      conversionProgress: t.conversionProgress,
      sourceFileName: t.fileSource.name,
      sourceFileSize: t.fileSource.size,
      resultFileName: t.fileResult?.name ?? null,
      resultFileId: t.fileResult?.id ?? null,
      retentionMode: t.retentionMode,
      dateExpires: t.dateExpires
    }));

    let statusFilter = ctx.input.status ? ` with status **${ctx.input.status}**` : '';

    return {
      output: {
        tasks: mappedTasks,
        totalCount: mappedTasks.length
      },
      message: `Found **${mappedTasks.length}** task(s)${statusFilter}.`
    };
  })
  .build();
