import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTask, rawSchema } from '../lib/response';
import { spec } from '../spec';

export let runTask = SlateTool.create(spec, {
  name: 'Run Task',
  key: 'run_task',
  description: `Execute a web scraping robot on-demand by providing its ID and input parameters (typically an \`originUrl\`). The task runs asynchronously — the response includes the task ID and its initial status. Use **Get Task** to poll for results once the task completes.`,
  instructions: [
    'The required input parameters depend on the robot configuration. Use **Get Robot** first to discover what parameters a robot expects.',
    'The most common input parameter is `originUrl` — the URL of the page to scrape.'
  ]
})
  .input(
    z.object({
      robotId: z
        .string()
        .describe('ID of the robot to run. Call list_robots to discover robot IDs.'),
      inputParameters: z
        .record(z.string(), z.any())
        .describe(
          'Key-value pairs of input parameters for the robot (e.g., { "originUrl": "https://example.com" })'
        ),
      recordVideo: z
        .boolean()
        .optional()
        .describe('Try to record a video while running this task')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the created task'),
      status: z.string().describe('Current status of the task (e.g., "in-progress")'),
      robotId: z
        .string()
        .describe('ID of the robot that was run. Call list_robots to discover robot IDs.'),
      raw: rawSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).createTask(
      ctx.input.robotId,
      ctx.input.inputParameters,
      ctx.input.recordVideo
    );
    let task = mapTask(result);
    return {
      output: { taskId: task.taskId, status: task.status, robotId: task.robotId, raw: result },
      message: `Task \`${task.taskId}\` created with status **${task.status}**.`
    };
  })
  .build();
