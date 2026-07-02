import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let taskCompleted = SlateTrigger.create(spec, {
  name: 'Task Completed',
  key: 'task_completed',
  description:
    'Triggers when a conversion task finishes (succeeds or fails). Polls for recently completed tasks and emits events for each new completion.'
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the completed task'),
      conversionType: z.string().describe('The conversion type (e.g. convert.pdf_to_word)'),
      status: z.enum(['SUCCESS', 'ERROR']).describe('Final task status'),
      errorMessage: z.string().nullable().describe('Error message if the task failed'),
      dateCreated: z.string().describe('ISO timestamp when the task was created'),
      dateFinished: z.string().nullable().describe('ISO timestamp when the task finished'),
      sourceFileName: z.string().describe('Name of the source file'),
      sourceFileSize: z.number().describe('Size of the source file in bytes'),
      resultFileId: z.string().nullable().describe('File ID of the result file'),
      resultFileName: z.string().nullable().describe('Name of the result file')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the completed task'),
      conversionType: z.string().describe('The conversion type'),
      status: z.string().describe('Final task status: SUCCESS or ERROR'),
      errorMessage: z.string().nullable().describe('Error message if the task failed'),
      dateCreated: z.string().describe('When the task was created'),
      dateFinished: z.string().nullable().describe('When the task finished'),
      sourceFileName: z.string().describe('Name of the source file'),
      sourceFileSize: z.number().describe('Size of the source file in bytes'),
      resultFileId: z.string().nullable().describe('File ID of the result (for downloading)'),
      resultFileName: z.string().nullable().describe('Name of the result file')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let seenTaskIds: string[] = ctx.input.state?.seenTaskIds ?? [];

      let tasks = await client.listTasks();

      let completedTasks = tasks.filter(
        t => (t.status === 'SUCCESS' || t.status === 'ERROR') && !seenTaskIds.includes(t.id)
      );

      let newSeenIds = [...completedTasks.map(t => t.id), ...seenTaskIds].slice(0, 500);

      return {
        inputs: completedTasks.map(t => ({
          taskId: t.id,
          conversionType: t.type,
          status: t.status as 'SUCCESS' | 'ERROR',
          errorMessage: t.error,
          dateCreated: t.dateCreated,
          dateFinished: t.dateFinished,
          sourceFileName: t.fileSource.name,
          sourceFileSize: t.fileSource.size,
          resultFileId: t.fileResult?.id ?? null,
          resultFileName: t.fileResult?.name ?? null
        })),
        updatedState: {
          seenTaskIds: newSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.status === 'SUCCESS' ? 'task.succeeded' : 'task.failed';

      return {
        type: eventType,
        id: ctx.input.taskId,
        output: {
          taskId: ctx.input.taskId,
          conversionType: ctx.input.conversionType,
          status: ctx.input.status,
          errorMessage: ctx.input.errorMessage,
          dateCreated: ctx.input.dateCreated,
          dateFinished: ctx.input.dateFinished,
          sourceFileName: ctx.input.sourceFileName,
          sourceFileSize: ctx.input.sourceFileSize,
          resultFileId: ctx.input.resultFileId,
          resultFileName: ctx.input.resultFileName
        }
      };
    }
  })
  .build();
