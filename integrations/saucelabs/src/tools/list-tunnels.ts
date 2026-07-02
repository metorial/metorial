import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let tunnelSchema = z.object({
  tunnelId: z.string().describe('Tunnel identifier'),
  owner: z.string().optional().describe('Tunnel owner username'),
  status: z.string().optional().describe('Tunnel status'),
  isReady: z.boolean().optional().describe('Whether the tunnel is ready'),
  tunnelIdentifier: z.string().optional().describe('User-specified tunnel name/identifier'),
  creationTime: z.number().optional().describe('Tunnel creation time (Unix timestamp)'),
  launchTime: z.number().optional().describe('Tunnel launch time (Unix timestamp)'),
  lastConnected: z.number().optional().describe('Last connection time (Unix timestamp)')
});

export let listTunnels = SlateTool.create(spec, {
  name: 'List Tunnels',
  key: 'list_tunnels',
  description: `List active Sauce Connect proxy tunnels for your account. Shows tunnel status, readiness, and connection details. Optionally include shared tunnels from other team members.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      includeShared: z
        .boolean()
        .default(false)
        .describe('Include tunnels shared by other users in your team')
    })
  )
  .output(
    z.object({
      tunnels: z.array(tunnelSchema).describe('Active tunnels'),
      totalCount: z.number().describe('Number of tunnels returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listTunnels({
      full: true,
      all: ctx.input.includeShared || undefined
    });

    let tunnelsRaw = Array.isArray(result) ? result : [];
    let tunnels = tunnelsRaw.map((t: any) => ({
      tunnelId: t.id,
      owner: t.owner,
      status: t.status,
      isReady: t.is_ready,
      tunnelIdentifier: t.tunnel_identifier,
      creationTime: t.creation_time,
      launchTime: t.launch_time,
      lastConnected: t.last_connected
    }));

    return {
      output: { tunnels, totalCount: tunnels.length },
      message: `Found **${tunnels.length}** active tunnel(s).`
    };
  })
  .build();
