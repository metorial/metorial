import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let refSchema = z
  .object({
    id: z.string(),
    uri: z.string()
  })
  .optional()
  .nullable();

let tunnelOutputSchema = z.object({
  tunnelId: z.string().describe('Tunnel ID'),
  publicUrl: z.string().describe('Public URL for the tunnel'),
  startedAt: z.string().describe('When the tunnel started'),
  metadata: z.string().describe('Metadata'),
  proto: z.string().describe('Protocol'),
  region: z.string().describe('Region'),
  forwardsTo: z.string().describe('Local address the tunnel forwards to'),
  labels: z.record(z.string(), z.string()).describe('Tunnel labels'),
  tunnelSession: refSchema.describe('Associated session'),
  endpoint: refSchema.describe('Associated endpoint')
});

let mapTunnel = (t: any) => ({
  tunnelId: t.id,
  publicUrl: t.public_url || '',
  startedAt: t.started_at || '',
  metadata: t.metadata || '',
  proto: t.proto || '',
  region: t.region || '',
  forwardsTo: t.forwards_to || '',
  labels: t.labels || {},
  tunnelSession: t.tunnel_session?.id
    ? { id: t.tunnel_session.id, uri: t.tunnel_session.uri }
    : null,
  endpoint: t.endpoint?.id ? { id: t.endpoint.id, uri: t.endpoint.uri } : null
});

let sessionOutputSchema = z.object({
  sessionId: z.string().describe('Tunnel session ID'),
  agentVersion: z.string().describe('Agent version'),
  ip: z.string().describe('Agent IP address'),
  os: z.string().describe('Agent operating system'),
  region: z.string().describe('Region'),
  startedAt: z.string().describe('When the session started'),
  transport: z.string().describe('Transport protocol'),
  metadata: z.string().describe('Metadata'),
  credential: refSchema.describe('Credential used for the session')
});

let mapSession = (s: any) => ({
  sessionId: s.id,
  agentVersion: s.agent_version || '',
  ip: s.ip || '',
  os: s.os || '',
  region: s.region || '',
  startedAt: s.started_at || '',
  transport: s.transport || '',
  metadata: s.metadata || '',
  credential: s.credential?.id ? { id: s.credential.id, uri: s.credential.uri } : null
});

export let listTunnels = SlateTool.create(spec, {
  name: 'List Tunnels',
  key: 'list_tunnels',
  description: `List all active tunnels. Tunnels are created by running ngrok agents and provide public endpoints to access your local services. This is a read-only listing.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      tunnels: z.array(tunnelOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listTunnels({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let tunnels = (result.tunnels || []).map(mapTunnel);
    return {
      output: { tunnels, nextPageUri: result.next_page_uri || null },
      message: `Found **${tunnels.length}** active tunnel(s).`
    };
  })
  .build();

export let getTunnel = SlateTool.create(spec, {
  name: 'Get Tunnel',
  key: 'get_tunnel',
  description: `Retrieve details of a specific active tunnel, including its public URL, protocol, and where it forwards traffic.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      tunnelId: z.string().describe('Tunnel ID (e.g., tn_xxx)')
    })
  )
  .output(tunnelOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let t = await client.getTunnel(ctx.input.tunnelId);
    return {
      output: mapTunnel(t),
      message: `Retrieved tunnel **${t.id}** forwarding to ${t.forwards_to}.`
    };
  })
  .build();

export let listTunnelSessions = SlateTool.create(spec, {
  name: 'List Tunnel Sessions',
  key: 'list_tunnel_sessions',
  description: `List all active tunnel sessions. Sessions represent running ngrok agent or SSH reverse tunnel connections. Each session can include multiple tunnels.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      sessions: z.array(sessionOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listTunnelSessions({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let sessions = (result.tunnel_sessions || []).map(mapSession);
    return {
      output: { sessions, nextPageUri: result.next_page_uri || null },
      message: `Found **${sessions.length}** active session(s).`
    };
  })
  .build();

export let restartTunnelSession = SlateTool.create(spec, {
  name: 'Restart Tunnel Session',
  key: 'restart_tunnel_session',
  description: `Restart an ngrok agent tunnel session. Uses exec() to restart the agent process. Not supported on Windows agents.`,
  constraints: [
    'Not supported on Windows agents',
    'The agent process will be replaced via exec()'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      sessionId: z.string().describe('Tunnel session ID to restart')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.restartTunnelSession(ctx.input.sessionId);
    return {
      output: { success: true },
      message: `Restart command sent to session **${ctx.input.sessionId}**.`
    };
  })
  .build();

export let stopTunnelSession = SlateTool.create(spec, {
  name: 'Stop Tunnel Session',
  key: 'stop_tunnel_session',
  description: `Stop an ngrok agent tunnel session. This will terminate all tunnels associated with the session.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      sessionId: z.string().describe('Tunnel session ID to stop')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.stopTunnelSession(ctx.input.sessionId);
    return {
      output: { success: true },
      message: `Stop command sent to session **${ctx.input.sessionId}**.`
    };
  })
  .build();
