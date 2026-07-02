import { SlateTool } from 'slates';
import { z } from 'zod';
import { EagleDocClient } from '../lib/client';
import { spec } from '../spec';

export let checkBatchTask = SlateTool.create(spec, {
  name: 'Check Batch Task',
  key: 'check_batch_task',
  description: `Check the status and retrieve results of a batch document processing task. Use the task ID returned by the "Submit Batch Processing" tool.

When the task status is "Finished", the results contain extracted data for each document. You can also delete a completed task to clean up.`,
  instructions: [
    'Provide the taskId returned from the "Submit Batch Processing" tool.',
    'Poll periodically until status is "Finished" or "Error".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Batch task ID to check'),
      deleteAfterRetrieval: z
        .boolean()
        .optional()
        .default(false)
        .describe('Delete the task after retrieving results')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      status: z.string().describe('Task status: Received, Processing, Finished, or Error'),
      createdTime: z.string().optional().describe('Task creation timestamp'),
      finishedTime: z.string().nullable().optional().describe('Task completion timestamp'),
      numberOfFiles: z.number().optional().describe('Number of files in the batch'),
      numberOfPages: z.number().optional().describe('Total pages processed'),
      results: z
        .any()
        .optional()
        .describe('Extraction results (available when status is Finished)'),
      messages: z.any().optional().describe('Any messages or errors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EagleDocClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getBatchTaskStatus(ctx.input.taskId);

    if (ctx.input.deleteAfterRetrieval && result.status === 'Finished') {
      await client.deleteBatchTask(ctx.input.taskId);
      ctx.info('Task deleted after retrieval.');
    }

    return {
      output: {
        taskId: result.id,
        status: result.status,
        createdTime: result.createdTime,
        finishedTime: result.finishedTime,
        numberOfFiles: result.numberOfFiles,
        numberOfPages: result.numberOfPages,
        results: result.results || result.result,
        messages: result.messages
      },
      message: `Batch task **${result.id}** status: **${result.status}**.${result.status === 'Finished' ? ` ${result.numberOfFiles || 0} file(s) processed.` : ''}${ctx.input.deleteAfterRetrieval && result.status === 'Finished' ? ' Task deleted.' : ''}`
    };
  })
  .build();
