import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBulkRun = SlateTool.create(spec, {
  name: 'Get Bulk Run',
  key: 'get_bulk_run',
  description: `Retrieve the status and progress of a bulk run. Returns the current state, counts of successful and failed tasks, and completion timestamp. Use this to monitor the progress of large-scale extraction operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      robotId: z.string().describe('ID of the robot the bulk run belongs to'),
      bulkRunId: z.string().describe('ID of the bulk run to retrieve')
    })
  )
  .output(
    z.object({
      bulkRunId: z.string().describe('ID of the bulk run'),
      title: z.string().optional().describe('Title of the bulk run'),
      status: z
        .string()
        .describe('Current status of the bulk run (e.g., "running", "completed")'),
      totalTaskCount: z.number().optional().describe('Total number of tasks in this bulk run'),
      successfulTaskCount: z
        .number()
        .optional()
        .describe('Number of tasks completed successfully'),
      failedTaskCount: z.number().optional().describe('Number of tasks that failed'),
      createdAt: z
        .number()
        .optional()
        .describe('Unix timestamp when the bulk run was created'),
      finishedAt: z.number().optional().describe('Unix timestamp when the bulk run finished')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getBulkRun(ctx.input.robotId, ctx.input.bulkRunId);

    let bulkRun = result.bulkRun ?? result;

    return {
      output: {
        bulkRunId: bulkRun.id,
        title: bulkRun.title,
        status: bulkRun.status,
        totalTaskCount: bulkRun.totalTaskCount,
        successfulTaskCount: bulkRun.successfulTaskCount,
        failedTaskCount: bulkRun.failedTaskCount,
        createdAt: bulkRun.createdAt,
        finishedAt: bulkRun.finishedAt
      },
      message:
        bulkRun.status === 'completed'
          ? `Bulk run \`${bulkRun.id}\` **completed**: ${bulkRun.successfulTaskCount ?? '?'} succeeded, ${bulkRun.failedTaskCount ?? '?'} failed.`
          : `Bulk run \`${bulkRun.id}\` is **${bulkRun.status}**.`
    };
  })
  .build();
