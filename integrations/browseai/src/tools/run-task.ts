import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      robotId: z.string().describe('ID of the robot to run'),
      inputParameters: z
        .record(z.string(), z.any())
        .describe(
          'Key-value pairs of input parameters for the robot (e.g., { "originUrl": "https://example.com" })'
        )
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the created task'),
      status: z.string().describe('Current status of the task (e.g., "running")'),
      robotId: z.string().describe('ID of the robot that was run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createTask(ctx.input.robotId, ctx.input.inputParameters);

    return {
      output: {
        taskId: result.id,
        status: result.status,
        robotId: result.robotId ?? ctx.input.robotId
      },
      message: `Task \`${result.id}\` created with status **${result.status}**.`
    };
  })
  .build();
