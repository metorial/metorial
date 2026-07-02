import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      robotId: z.string().describe('ID of the robot the task belongs to'),
      taskId: z.string().describe('ID of the task to retrieve')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the task'),
      status: z.string().describe('Task status (e.g., "running", "successful", "failed")'),
      robotId: z.string().describe('ID of the robot'),
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
      videoUrl: z.string().optional().describe('URL to debug video of the robot execution')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let task = await client.getTask(ctx.input.robotId, ctx.input.taskId);

    return {
      output: {
        taskId: task.id,
        status: task.status,
        robotId: task.robotId ?? ctx.input.robotId,
        capturedTexts: task.capturedTexts,
        capturedScreenshots: task.capturedScreenshots,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        finishedAt: task.finishedAt,
        userFriendlyError: task.userFriendlyError,
        videoUrl: task.videoUrl
      },
      message:
        task.status === 'successful'
          ? `Task \`${task.id}\` completed **successfully** with ${Object.keys(task.capturedTexts ?? {}).length} captured field(s).`
          : task.status === 'failed'
            ? `Task \`${task.id}\` **failed**: ${task.userFriendlyError ?? 'Unknown error'}.`
            : `Task \`${task.id}\` is currently **${task.status}**.`
    };
  })
  .build();
