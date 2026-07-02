import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FlyClient } from '../lib/client';
import { spec } from '../spec';

export let appMachinesChanged = SlateTrigger.create(spec, {
  name: 'App Machines Changed',
  key: 'app_machines_changed',
  description:
    'Triggers when machines are added to or removed from a Fly App. Detects new machine creation and machine destruction events. Requires appName to be set in the configuration.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'destroyed'])
        .describe('Whether a machine was created or destroyed'),
      machineId: z.string().describe('Machine ID'),
      machineName: z.string().describe('Machine name'),
      appName: z.string().describe('App the machine belongs to'),
      region: z.string().describe('Region of the machine'),
      state: z.string().describe('Current state of the machine'),
      detectedAt: z.string().describe('When the change was detected')
    })
  )
  .output(
    z.object({
      machineId: z.string().describe('Machine identifier'),
      machineName: z.string().describe('Machine name'),
      appName: z.string().describe('App the machine belongs to'),
      region: z.string().describe('Region of the machine'),
      state: z.string().describe('Current state of the machine'),
      detectedAt: z.string().describe('When the change was detected')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let appName = ctx.config.appName;
      if (!appName) {
        return { inputs: [] };
      }

      let client = new FlyClient({
        token: ctx.auth.token,
        tokenScheme: ctx.auth.tokenScheme,
        baseUrl: ctx.config.baseUrl
      });

      let machines = await client.listMachines(appName);

      let previousMachineIds: string[] = (ctx.state?.machineIds as string[]) || [];
      let initialized = ctx.state?.initialized as boolean | undefined;
      let currentMachineIds = machines.map(m => m.machineId);
      let now = new Date().toISOString();

      let inputs: Array<{
        eventType: 'created' | 'destroyed';
        machineId: string;
        machineName: string;
        appName: string;
        region: string;
        state: string;
        detectedAt: string;
      }> = [];

      // Only emit events if we have previous state (avoid emitting everything on first poll)
      if (previousMachineIds.length > 0 || initialized) {
        for (let machine of machines) {
          if (!previousMachineIds.includes(machine.machineId)) {
            inputs.push({
              eventType: 'created',
              machineId: machine.machineId,
              machineName: machine.machineName,
              appName,
              region: machine.region,
              state: machine.state,
              detectedAt: now
            });
          }
        }

        for (let prevId of previousMachineIds) {
          if (!currentMachineIds.includes(prevId)) {
            inputs.push({
              eventType: 'destroyed',
              machineId: prevId,
              machineName: '',
              appName,
              region: '',
              state: 'destroyed',
              detectedAt: now
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          machineIds: currentMachineIds,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `machine.${ctx.input.eventType}`,
        id: `${ctx.input.machineId}-${ctx.input.eventType}-${ctx.input.detectedAt}`,
        output: {
          machineId: ctx.input.machineId,
          machineName: ctx.input.machineName,
          appName: ctx.input.appName,
          region: ctx.input.region,
          state: ctx.input.state,
          detectedAt: ctx.input.detectedAt
        }
      };
    }
  })
  .build();
