import { isApiErrorRecord, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapBulkRun, mapTask, object, objects, rawSchema } from '../lib/response';
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
      robotId: z
        .string()
        .describe(
          'ID of the robot the bulk run belongs to. Call list_robots to discover robot IDs.'
        ),
      bulkRunId: z.string().describe('ID of the bulk run to retrieve'),
      page: z.number().int().min(1).optional().describe('Page of tasks within the bulk run')
    })
  )
  .output(
    z.object({
      bulkRunId: z.string().describe('ID of the bulk run'),
      title: z.string().optional().describe('Title of the bulk run'),
      status: z
        .string()
        .describe(
          'Current status of the bulk run (e.g., "in-progress", "finished", "paused", "stopped")'
        ),
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
      finishedAt: z.number().optional().describe('Unix timestamp when the bulk run finished'),
      tasks: z
        .array(rawSchema)
        .optional()
        .describe('Tasks in the requested page, including captured tables'),
      taskPagination: rawSchema
        .optional()
        .describe('Provider pagination metadata and task data'),
      raw: rawSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth).getBulkRun(
      ctx.input.robotId,
      ctx.input.bulkRunId,
      ctx.input.page
    );
    let result = object(response.result ?? response, 'bulk run result');
    let bulkRun = object(result.bulkRun ?? result, 'bulk run');
    let taskPage = isApiErrorRecord(result.robotTasks) ? result.robotTasks : undefined;
    let output = {
      ...mapBulkRun(bulkRun),
      ...pickDefined({
        tasks: taskPage ? objects(taskPage.items, 'bulk run tasks').map(mapTask) : undefined,
        taskPagination: taskPage,
        raw: result
      })
    };
    return { output, message: `Bulk run \`${output.bulkRunId}\` is **${output.status}**.` };
  })
  .build();
