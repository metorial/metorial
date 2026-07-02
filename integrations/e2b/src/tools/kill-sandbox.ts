import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let killSandbox = SlateTool.create(spec, {
  name: 'Kill Sandbox',
  key: 'kill_sandbox',
  description: `Permanently terminate a running or paused sandbox. All files, processes, and state will be destroyed. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sandboxId: z.string().describe('The unique identifier of the sandbox to terminate.')
    })
  )
  .output(
    z.object({
      sandboxId: z.string().describe('The ID of the terminated sandbox.'),
      killed: z.boolean().describe('Whether the sandbox was successfully terminated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Terminating sandbox...');
    await client.killSandbox(ctx.input.sandboxId);

    return {
      output: {
        sandboxId: ctx.input.sandboxId,
        killed: true
      },
      message: `Sandbox **${ctx.input.sandboxId}** has been permanently terminated.`
    };
  })
  .build();
