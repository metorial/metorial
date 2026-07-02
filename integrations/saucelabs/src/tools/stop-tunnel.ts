import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let stopTunnel = SlateTool.create(spec, {
  name: 'Stop Tunnel',
  key: 'stop_tunnel',
  description: `Shut down an active Sauce Connect proxy tunnel. Returns the number of jobs that were still using the tunnel at the time of shutdown.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      tunnelId: z.string().describe('The unique ID of the tunnel to stop')
    })
  )
  .output(
    z.object({
      tunnelId: z.string().describe('ID of the stopped tunnel'),
      success: z.boolean().describe('Whether the tunnel was successfully stopped'),
      jobsRunning: z.number().optional().describe('Number of jobs that were using the tunnel')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.stopTunnel(ctx.input.tunnelId);

    return {
      output: {
        tunnelId: result.id ?? ctx.input.tunnelId,
        success: result.result === true,
        jobsRunning: result.jobs_running
      },
      message: `Stopped tunnel **${ctx.input.tunnelId}**${result.jobs_running != null ? ` (${result.jobs_running} jobs were running)` : ''}.`
    };
  })
  .build();
