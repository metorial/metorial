import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { taskDataDownload } from '../lib/files';
import { mapTask } from '../lib/response';
import { spec } from '../spec';

export let downloadTaskData = SlateTool.create(spec, {
  key: 'download_task_data',
  name: 'Download Task Data',
  description:
    'Download a task’s captured text, tables, and screenshot metadata as JSON. Uses the provider’s temporary data download for results larger than 100 KB. Discover task IDs with list_tasks.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      robotId: z.string().describe('Robot ID discovered with list_robots'),
      taskId: z.string().describe('Task ID discovered with list_tasks or run_task')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      status: z.string().describe('Current task status'),
      fileName: z.string().describe('Download filename'),
      mimeType: z.string().describe('Download media type')
    })
  )
  .handleInvocation(async ctx => {
    let task = await new Client(ctx.auth).getTask(ctx.input.robotId, ctx.input.taskId);
    let summary = mapTask(task);
    let fileName = `browse-ai-task-${summary.taskId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    if (summary.capturedDataTemporaryUrl) {
      let download = taskDataDownload(summary.capturedDataTemporaryUrl);
      await ctx.addAttachment({
        type: 'url',
        url: download.url,
        filename: fileName,
        mimeType: 'application/json',
        refreshReference: { robotId: summary.robotId, taskId: summary.taskId },
        refreshAt: download.refreshAt
      });
    } else {
      if (
        task.capturedTexts == null &&
        task.capturedLists == null &&
        task.capturedScreenshots == null
      ) {
        throw createApiServiceError(
          'The task has no captured data available yet. Check get_task and retry when data is available.'
        );
      }
      await ctx.addAttachment({
        type: 'content',
        filename: fileName,
        mimeType: 'application/json',
        content: new Response(
          JSON.stringify({
            capturedTexts: task.capturedTexts,
            capturedLists: task.capturedLists,
            capturedScreenshots: task.capturedScreenshots
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      });
    }
    return {
      output: {
        taskId: summary.taskId,
        status: summary.status,
        fileName,
        mimeType: 'application/json'
      },
      message: `Prepared task \`${summary.taskId}\` data for download.`
    };
  })
  .build();
