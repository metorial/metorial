import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getTunnel = SlateTool.create(spec, {
  name: 'Get Tunnel Details',
  key: 'get_tunnel',
  description:
    'Inspect a Sauce Connect tunnel, its readiness, and optionally its running job count. Use list_tunnels to discover tunnel IDs and owners.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      tunnelId: z.string().min(1).describe('Tunnel ID returned by list_tunnels'),
      username: z
        .string()
        .optional()
        .describe('Tunnel owner returned by list_tunnels; defaults to the authenticated user'),
      includeJobCount: z
        .boolean()
        .default(false)
        .describe('Include the number of jobs currently using the tunnel')
    })
  )
  .output(
    z.object({
      tunnelId: z.string().describe('Tunnel ID'),
      owner: z.string().optional().describe('Tunnel owner'),
      status: z.string().optional().describe('Tunnel status'),
      isReady: z.boolean().optional().describe('Whether the tunnel is ready for tests'),
      tunnelIdentifier: z.string().optional().describe('Tunnel name'),
      host: z.string().optional().describe('Tunnel host'),
      creationTime: z.number().optional().describe('Creation time in Unix seconds'),
      lastConnected: z.number().optional().describe('Last connection time in Unix seconds'),
      jobsRunning: z.number().optional().describe('Jobs currently using the tunnel')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let tunnel = await client.getTunnel(ctx.input.tunnelId, ctx.input.username);
    let count = ctx.input.includeJobCount
      ? await client.getTunnelJobCount(ctx.input.tunnelId, ctx.input.username)
      : undefined;
    return {
      output: {
        tunnelId: tunnel.id,
        owner: tunnel.owner ?? undefined,
        status: tunnel.status ?? undefined,
        isReady: tunnel.is_ready ?? undefined,
        tunnelIdentifier: tunnel.tunnel_identifier ?? undefined,
        host: tunnel.host ?? undefined,
        creationTime: tunnel.creation_time ?? undefined,
        lastConnected: tunnel.last_connected ?? undefined,
        jobsRunning: count?.jobs_running
      },
      message: `Tunnel **${tunnel.id}**: ${tunnel.status ?? 'unknown status'}.`
    };
  })
  .build();
