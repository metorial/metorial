import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let setSandboxTimeout = SlateTool.create(spec, {
  name: 'Set Sandbox Timeout',
  key: 'set_sandbox_timeout',
  description: `Extend or reduce the timeout of a running sandbox. After the timeout expires, the sandbox will be killed or paused (depending on its auto-pause configuration).`,
  constraints: [
    'Maximum timeout is 86400 seconds (24 hours) for Pro users and 3600 seconds (1 hour) for Hobby users.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sandboxId: z.string().describe('The unique identifier of the sandbox.'),
      timeout: z.number().describe('New timeout in seconds from now.')
    })
  )
  .output(
    z.object({
      sandboxId: z.string().describe('The ID of the sandbox whose timeout was updated.'),
      updated: z.boolean().describe('Whether the timeout was successfully updated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Updating sandbox timeout...');
    await client.setSandboxTimeout(ctx.input.sandboxId, ctx.input.timeout);

    return {
      output: {
        sandboxId: ctx.input.sandboxId,
        updated: true
      },
      message: `Timeout for sandbox **${ctx.input.sandboxId}** updated to **${ctx.input.timeout}** seconds.`
    };
  })
  .build();
