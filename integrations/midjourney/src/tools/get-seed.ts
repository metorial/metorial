import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSeed = SlateTool.create(spec, {
  name: 'Get Seed',
  key: 'get_seed',
  description:
    'Request the seed value for a completed Midjourney image task. The seed request is asynchronous.',
  instructions: [
    'Pass the task ID of the generated image whose seed you need.',
    'Set waitForResult to true when you want the tool to poll until APIFRAME returns the seed value.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID of the image task whose seed should be fetched'),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, polls until the seed lookup completes and returns the seed')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the seed lookup task'),
      status: z.string().optional().describe('Current status of the seed lookup task'),
      seed: z.string().optional().describe('Seed value returned by Midjourney')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Submitting seed lookup request...');

    let submitResult = await client.getSeed({
      taskId: ctx.input.taskId
    });

    if (!ctx.input.waitForResult) {
      return {
        output: {
          taskId: submitResult.task_id,
          status: 'submitted'
        },
        message: `Seed lookup task **${submitResult.task_id}** submitted. Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for seed lookup to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: result.status ?? 'completed',
        seed: result.seed
      },
      message: result.seed
        ? `Seed lookup completed. Seed: ${result.seed}.`
        : 'Seed lookup completed, but no seed value was returned.'
    };
  })
  .build();
