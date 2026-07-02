import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let roamingClientChanges = SlateTrigger.create(spec, {
  name: 'Roaming Client Changes',
  key: 'roaming_client_changes',
  description:
    'Triggers when roaming clients (agents) are added or removed. Monitors the agent roster for changes between polling intervals.'
})
  .input(
    z.object({
      eventType: z
        .enum(['added', 'removed'])
        .describe('Whether the client was added or removed'),
      roamingClientId: z.string().describe('Roaming client ID'),
      hostname: z.string().describe('Hostname of the client'),
      clientData: z.record(z.string(), z.any()).describe('Full roaming client data')
    })
  )
  .output(
    z.object({
      roamingClientId: z.string().describe('Roaming client ID'),
      hostname: z.string().describe('Hostname of the client'),
      eventType: z.string().describe('Type of change'),
      roamingClient: z.record(z.string(), z.any()).describe('Full roaming client data')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);
      let result = await client.listRoamingClients();
      let currentClients: any[] = result?.data ?? result ?? [];

      let currentClientIds = new Set(currentClients.map((c: any) => String(c.id)));
      let previousClientIds: Set<string> = new Set((ctx.state?.clientIds as string[]) ?? []);

      let inputs: Array<{
        eventType: 'added' | 'removed';
        roamingClientId: string;
        hostname: string;
        clientData: Record<string, any>;
      }> = [];

      for (let rc of currentClients) {
        let rcId = String(rc.id);
        if (!previousClientIds.has(rcId)) {
          inputs.push({
            eventType: 'added',
            roamingClientId: rcId,
            hostname: rc.hostname ?? '',
            clientData: rc
          });
        }
      }

      for (let prevId of previousClientIds) {
        if (!currentClientIds.has(prevId)) {
          inputs.push({
            eventType: 'removed',
            roamingClientId: prevId,
            hostname: '',
            clientData: { id: prevId }
          });
        }
      }

      return {
        inputs,
        updatedState: {
          clientIds: Array.from(currentClientIds)
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: `roaming_client.${ctx.input.eventType}`,
        id: `rc-${ctx.input.roamingClientId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          roamingClientId: ctx.input.roamingClientId,
          hostname: ctx.input.hostname,
          eventType: ctx.input.eventType,
          roamingClient: ctx.input.clientData
        }
      };
    }
  })
  .build();
