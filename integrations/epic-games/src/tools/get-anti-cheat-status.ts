import { SlateTool } from 'slates';
import { z } from 'zod';
import { gameClient } from '../lib/client';
import { spec } from '../spec';

export let getAntiCheatStatus = SlateTool.create(spec, {
  name: 'Get Anti-Cheat Status',
  key: 'get_anti_cheat_status',
  description: `Inspect the deployment’s native server-kick policy. This does not report player cheat detection, service uptime or client health.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      serverKick: z
        .boolean()
        .describe('Whether anti-cheat server kicks are enabled for this deployment')
    })
  )
  .handleInvocation(async ctx => {
    const data = await gameClient(ctx).getAntiCheatStatus();
    return {
      output: data,
      message: `The deployment server-kick policy is ${data.serverKick ? 'enabled' : 'disabled'}. This does not report individual player cheat detection or game-client health.`
    };
  })
  .build();
