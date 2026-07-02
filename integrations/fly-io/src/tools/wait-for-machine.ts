import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let waitForMachine = SlateTool.create(spec, {
  name: 'Wait for Machine State',
  key: 'wait_for_machine',
  description: `Block until a Fly Machine reaches a specific state. Useful for orchestrating machine lifecycle operations where you need to wait for a transition to complete.`,
  instructions: [
    'For waiting on the "stopped" state, provide the instanceId to avoid race conditions.'
  ],
  constraints: ['Default timeout is 60 seconds. Maximum depends on server configuration.']
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      machineId: z.string().describe('ID of the machine to wait on'),
      state: z
        .enum(['started', 'stopped', 'suspended', 'destroyed'])
        .describe('Target state to wait for'),
      timeout: z.number().optional().describe('Maximum wait time in seconds (default: 60)'),
      instanceId: z
        .string()
        .optional()
        .describe('Instance ID to wait on (recommended for "stopped" state)')
    })
  )
  .output(
    z.object({
      reached: z.boolean().describe('Whether the target state was reached')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.waitForMachine(ctx.input.appName, ctx.input.machineId, {
      state: ctx.input.state,
      timeout: ctx.input.timeout,
      instanceId: ctx.input.instanceId
    });

    return {
      output: { reached: true },
      message: `Machine **${ctx.input.machineId}** reached **${ctx.input.state}** state.`
    };
  })
  .build();
