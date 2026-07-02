import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

export let endpointChangesTrigger = SlateTrigger.create(spec, {
  name: 'Endpoint Changes',
  key: 'endpoint_changes',
  description:
    'Triggers when endpoints are created or removed. Polls for active endpoints and detects changes between polling intervals.'
})
  .input(
    z.object({
      changeType: z.enum(['created', 'removed']).describe('Type of change'),
      endpointId: z.string().describe('Endpoint ID'),
      url: z.string().describe('Endpoint URL'),
      hostport: z.string().describe('Host and port'),
      proto: z.string().describe('Protocol'),
      type: z.string().describe('Endpoint type'),
      createdAt: z.string().describe('Creation timestamp'),
      description: z.string().describe('Description'),
      metadata: z.string().describe('Metadata')
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('Endpoint ID'),
      url: z.string().describe('Endpoint URL'),
      hostport: z.string().describe('Host and port combination'),
      proto: z.string().describe('Protocol (http, https, tcp, tls)'),
      type: z.string().describe('Endpoint type (ephemeral, edge, cloud)'),
      createdAt: z.string().describe('Creation timestamp'),
      description: z.string().describe('Description'),
      metadata: z.string().describe('Metadata')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new NgrokClient(ctx.auth.token);
      let result = await client.listEndpoints({ limit: 100 });
      let currentEndpoints = result.endpoints || [];
      let currentMap = new Map<string, any>();
      for (let e of currentEndpoints) {
        currentMap.set(e.id, e);
      }

      let previousIds: string[] = (ctx.state?.endpointIds as string[]) || [];
      let previousIdSet = new Set(previousIds);
      let currentIds = new Set(currentMap.keys());

      let inputs: any[] = [];

      for (let [id, e] of currentMap) {
        if (!previousIdSet.has(id)) {
          inputs.push({
            changeType: 'created' as const,
            endpointId: e.id,
            url: e.url || '',
            hostport: e.hostport || '',
            proto: e.proto || '',
            type: e.type || '',
            createdAt: e.created_at || '',
            description: e.description || '',
            metadata: e.metadata || ''
          });
        }
      }

      for (let prevId of previousIds) {
        if (!currentIds.has(prevId)) {
          inputs.push({
            changeType: 'removed' as const,
            endpointId: prevId,
            url: '',
            hostport: '',
            proto: '',
            type: '',
            createdAt: '',
            description: '',
            metadata: ''
          });
        }
      }

      return {
        inputs,
        updatedState: {
          endpointIds: Array.from(currentIds)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `endpoint.${ctx.input.changeType}`,
        id: `${ctx.input.endpointId}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          endpointId: ctx.input.endpointId,
          url: ctx.input.url,
          hostport: ctx.input.hostport,
          proto: ctx.input.proto,
          type: ctx.input.type,
          createdAt: ctx.input.createdAt,
          description: ctx.input.description,
          metadata: ctx.input.metadata
        }
      };
    }
  })
  .build();
