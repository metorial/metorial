import { SlateTool } from 'slates';
import { z } from 'zod';
import { EosGameServicesClient } from '../lib/client';
import { spec } from '../spec';

export let getAntiCheatStatus = SlateTool.create(spec, {
  name: 'Get Anti-Cheat Status',
  key: 'get_anti_cheat_status',
  description: `Check the Easy Anti-Cheat service status for your deployment. Returns whether server-side kicks are enabled, indicating if anti-cheat enforcement is active.`,
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
    let client = new EosGameServicesClient({
      token: ctx.auth.token,
      deploymentId: ctx.config.deploymentId
    });

    let data = await client.getAntiCheatStatus();

    return {
      output: { serverKick: data.serverKick },
      message: `Anti-cheat server kicks are **${data.serverKick ? 'enabled' : 'disabled'}** for this deployment.`
    };
  })
  .build();
