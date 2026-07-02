import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stopPhantom = SlateTool.create(spec, {
  name: 'Stop Phantom',
  key: 'stop_phantom',
  description: `Abort a currently running Phantom execution. Stops all running instances of the specified Phantom.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      phantomId: z.string().describe('ID of the Phantom to stop')
    })
  )
  .output(
    z.object({
      stopped: z.boolean().describe('Whether the stop command was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.stopAgent(ctx.input.phantomId);

    return {
      output: { stopped: true },
      message: `Phantom **${ctx.input.phantomId}** has been stopped.`
    };
  })
  .build();
