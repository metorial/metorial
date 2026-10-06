import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stopCall = SlateTool.create(spec, {
  name: 'Stop Call',
  key: 'stop_call',
  description: `Cancel a queued or scheduled outbound call. Can also stop all queued calls for an agent.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      executionId: z.string().optional().describe('Execution ID of a specific call to stop'),
      agentId: z
        .string()
        .optional()
        .describe('Agent ID to stop all queued calls for the agent')
    })
  )
  .output(
    z.object({
      stoppedExecutionIds: z
        .array(z.string())
        .optional()
        .describe('List of stopped execution IDs'),
      status: z.string().describe('Stop result status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (Boolean(ctx.input.executionId) === Boolean(ctx.input.agentId)) {
      throw createApiServiceError('Provide exactly one of executionId or agentId.');
    }

    if (ctx.input.executionId) {
      let result = await client.stopCall(ctx.input.executionId);
      return {
        output: {
          stoppedExecutionIds: [result.execution_id || ctx.input.executionId],
          status: result.status || 'stopped'
        },
        message: `Stopped call \`${ctx.input.executionId}\`.`
      };
    }

    if (ctx.input.agentId) {
      let result = await client.stopAgentCalls(ctx.input.agentId);
      let stopped = result.stopped_executions || [];
      return {
        output: {
          stoppedExecutionIds: stopped,
          status: 'stopped'
        },
        message: `Stopped **${stopped.length}** queued call(s) for agent \`${ctx.input.agentId}\`.`
      };
    }

    throw createApiServiceError('Provide executionId or agentId.');
  })
  .build();
