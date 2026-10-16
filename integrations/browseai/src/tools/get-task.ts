import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTask, rawSchema } from '../lib/response';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve the status and results of a specific task. When the task has completed successfully, the response includes extracted data in \`capturedTexts\` and any captured screenshots. Use this to check task progress or fetch scraped data after running a robot.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      robotId: z
        .string()
        .describe(
          'ID of the robot the task belongs to. Call list_robots to discover robot IDs.'
        ),
      taskId: z.string().describe('ID of the task to retrieve')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the task'),
      status: z.string().describe('Task status (e.g., "running", "successful", "failed")'),
      robotId: z.string().describe('ID of the robot. Call list_robots to discover robot IDs.'),
      capturedTexts: z
        .record(z.string(), z.any())
        .optional()
        .describe('Extracted text data as key-value pairs'),
      capturedScreenshots: z
        .record(z.string(), z.any())
        .optional()
        .describe('Captured screenshots as key-value pairs'),
      createdAt: z.number().optional().describe('Unix timestamp when the task was created'),
      startedAt: z
        .number()
        .optional()
        .describe('Unix timestamp when the task started running'),
      finishedAt: z.number().optional().describe('Unix timestamp when the task finished'),
      userFriendlyError: z
        .string()
        .optional()
        .describe('Human-readable error message if the task failed'),
      videoUrl: z.string().optional().describe('URL to debug video of the robot execution'),
      capturedLists: z
        .record(z.string(), z.any())
        .optional()
        .describe('Extracted tables and lists'),
      inputParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Input parameters used for the task'),
      robotBulkRunId: z.string().optional().describe('Bulk run that created the task'),
      runByTaskMonitorId: z.string().optional().describe('Monitor that created the task'),
      retriedOriginalTaskId: z
        .string()
        .optional()
        .describe('Original failed task in this retry chain'),
      retriedByTaskId: z.string().optional().describe('Task that retried this task'),
      capturedDataTemporaryUrl: z
        .string()
        .optional()
        .describe(
          'Temporary URL for data exceeding 100 KB; use Download Task Data for a downloadable result'
        ),
      raw: rawSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let task = await new Client(ctx.auth).getTask(ctx.input.robotId, ctx.input.taskId);
    let output = mapTask(task);
    return { output, message: `Task \`${output.taskId}\` is **${output.status}**.` };
  })
  .build();
