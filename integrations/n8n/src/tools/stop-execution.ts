import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
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
      stopped: z.boolean().describe('Whether the native receipt reports canceled'),
      status: z.string().optional().describe('Native status returned by the stop request')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);

    const result = await client.stopExecution(ctx.input.executionId);

    return {
      output: {
        stopped: result.status === 'canceled',
        status: String(result.status)
      },
      message: `Stop request accepted for execution **${ctx.input.executionId}**; native status is **${result.status}**. Prior external effects and retained history are not reversed.`
    };
  })
  .build();
