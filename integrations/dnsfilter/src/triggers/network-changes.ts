import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let networkChanges = SlateTrigger.create(spec, {
  name: 'Network Changes',
  key: 'network_changes',
  description:
    'Triggers when network sites are added or removed. Monitors the network list for changes between polling intervals.'
})
  .input(
    z.object({
      eventType: z
        .enum(['added', 'removed'])
        .describe('Whether the network was added or removed'),
      networkId: z.string().describe('Network ID'),
      networkName: z.string().describe('Network name'),
      networkData: z.record(z.string(), z.any()).describe('Full network data')
    })
  )
  .output(
    z.object({
      networkId: z.string().describe('Network ID'),
      networkName: z.string().describe('Network name'),
      eventType: z.string().describe('Type of change'),
      network: z.record(z.string(), z.any()).describe('Full network data')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);
      let currentNetworks = await client.listNetworks();

      let currentNetworkIds = new Set(currentNetworks.map((n: any) => String(n.id)));
      let previousNetworkIds: Set<string> = new Set((ctx.state?.networkIds as string[]) ?? []);

      let inputs: Array<{
        eventType: 'added' | 'removed';
        networkId: string;
        networkName: string;
        networkData: Record<string, any>;
      }> = [];

      for (let net of currentNetworks) {
        let netId = String(net.id);
        if (!previousNetworkIds.has(netId)) {
          inputs.push({
            eventType: 'added',
            networkId: netId,
            networkName: net.name ?? '',
            networkData: net
          });
        }
      }

      for (let prevId of previousNetworkIds) {
        if (!currentNetworkIds.has(prevId)) {
          inputs.push({
            eventType: 'removed',
            networkId: prevId,
            networkName: '',
            networkData: { id: prevId }
          });
        }
      }

      return {
        inputs,
        updatedState: {
          networkIds: Array.from(currentNetworkIds)
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: `network.${ctx.input.eventType}`,
        id: `net-${ctx.input.networkId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          networkId: ctx.input.networkId,
          networkName: ctx.input.networkName,
          eventType: ctx.input.eventType,
          network: ctx.input.networkData
        }
      };
    }
  })
  .build();
