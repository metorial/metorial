import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let pauseSandbox = SlateTool.create(spec, {
  name: 'Pause Sandbox',
  key: 'pause_sandbox',
  description: `Pause a running sandbox, preserving its full state including filesystem, memory, and running processes. The sandbox can be resumed later from the exact same state. Paused sandboxes persist indefinitely and do not count against runtime limits.`,
  constraints: ['Pausing takes approximately 4 seconds per 1 GiB of RAM.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sandboxId: z.string().describe('The unique identifier of the sandbox to pause.')
    })
  )
  .output(
    z.object({
      sandboxId: z.string().describe('The ID of the paused sandbox.'),
      paused: z.boolean().describe('Whether the sandbox was successfully paused.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Pausing sandbox...');
    await client.pauseSandbox(ctx.input.sandboxId);

    return {
      output: {
        sandboxId: ctx.input.sandboxId,
        paused: true
      },
      message: `Sandbox **${ctx.input.sandboxId}** has been paused. It can be resumed later with its full state preserved.`
    };
  })
  .build();
