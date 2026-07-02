import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stopExecution = SlateTool.create(spec, {
  name: 'Stop Execution',
  key: 'stop_execution',
  description: `Stop a currently running workflow execution.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      executionId: z.string().describe('ID of the running execution to stop')
    })
  )
  .output(
    z.object({
      stopped: z.boolean().describe('Whether the execution was successfully stopped')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    await client.stopExecution(ctx.input.executionId);

    return {
      output: {
        stopped: true
      },
      message: `Stopped execution **${ctx.input.executionId}**.`
    };
  })
  .build();
