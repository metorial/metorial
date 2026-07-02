import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
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

export let activeTunnelsTrigger = SlateTrigger.create(spec, {
  name: 'Tunnel Changes',
  key: 'tunnel_changes',
  description:
    'Triggers when tunnels are started or stopped. Polls for active tunnels and detects new or removed tunnels between polling intervals.'
})
  .input(
    z.object({
      changeType: z
        .enum(['started', 'stopped'])
        .describe('Whether the tunnel was started or stopped'),
      tunnelId: z.string().describe('Tunnel ID'),
      publicUrl: z.string().describe('Public URL'),
      startedAt: z.string().describe('When the tunnel started'),
      proto: z.string().describe('Protocol'),
      region: z.string().describe('Region'),
      forwardsTo: z.string().describe('Local forward address'),
      metadata: z.string().describe('Metadata'),
      labels: z.record(z.string(), z.string()).describe('Tunnel labels'),
      tunnelSession: refSchema.describe('Session reference'),
      endpoint: refSchema.describe('Endpoint reference')
    })
  )
  .output(
    z.object({
      tunnelId: z.string().describe('Tunnel ID'),
      publicUrl: z.string().describe('Public URL for the tunnel'),
      startedAt: z.string().describe('When the tunnel started'),
      proto: z.string().describe('Protocol (http, https, tcp, tls)'),
      region: z.string().describe('Region'),
      forwardsTo: z.string().describe('Local address the tunnel forwards to'),
      metadata: z.string().describe('Metadata'),
      labels: z.record(z.string(), z.string()).describe('Tunnel labels'),
      tunnelSessionId: z.string().optional().nullable().describe('Associated session ID'),
      endpointId: z.string().optional().nullable().describe('Associated endpoint ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new NgrokClient(ctx.auth.token);
      let result = await client.listTunnels({ limit: 100 });
      let currentTunnels = result.tunnels || [];
      let currentIds = new Set(currentTunnels.map((t: any) => t.id));
      let previousIds: string[] = (ctx.state?.tunnelIds as string[]) || [];
      let previousIdSet = new Set(previousIds);

      let inputs: any[] = [];

      for (let t of currentTunnels) {
        if (!previousIdSet.has(t.id)) {
          inputs.push({
            changeType: 'started' as const,
            tunnelId: t.id,
            publicUrl: t.public_url || '',
            startedAt: t.started_at || '',
            proto: t.proto || '',
            region: t.region || '',
            forwardsTo: t.forwards_to || '',
            metadata: t.metadata || '',
            labels: t.labels || {},
            tunnelSession: t.tunnel_session?.id
              ? { id: t.tunnel_session.id, uri: t.tunnel_session.uri }
              : null,
            endpoint: t.endpoint?.id ? { id: t.endpoint.id, uri: t.endpoint.uri } : null
          });
        }
      }

      for (let prevId of previousIds) {
        if (!currentIds.has(prevId)) {
          inputs.push({
            changeType: 'stopped' as const,
            tunnelId: prevId,
            publicUrl: '',
            startedAt: '',
            proto: '',
            region: '',
            forwardsTo: '',
            metadata: '',
            labels: {},
            tunnelSession: null,
            endpoint: null
          });
        }
      }

      return {
        inputs,
        updatedState: {
          tunnelIds: Array.from(currentIds)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `tunnel.${ctx.input.changeType}`,
        id: `${ctx.input.tunnelId}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          tunnelId: ctx.input.tunnelId,
          publicUrl: ctx.input.publicUrl,
          startedAt: ctx.input.startedAt,
          proto: ctx.input.proto,
          region: ctx.input.region,
          forwardsTo: ctx.input.forwardsTo,
          metadata: ctx.input.metadata,
          labels: ctx.input.labels,
          tunnelSessionId: ctx.input.tunnelSession?.id || null,
          endpointId: ctx.input.endpoint?.id || null
        }
      };
    }
  })
  .build();
