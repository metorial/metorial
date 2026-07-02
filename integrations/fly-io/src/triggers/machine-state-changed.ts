import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FlyClient } from '../lib/client';
import { spec } from '../spec';

export let machineStateChanged = SlateTrigger.create(spec, {
  name: 'Machine State Changed',
  key: 'machine_state_changed',
  description:
    'Triggers when a Fly Machine changes state (e.g. started, stopped, suspended, destroyed). Polls machines in the configured app and detects state transitions. Requires appName to be set in the configuration.'
})
  .input(
    z.object({
      machineId: z.string().describe('Machine ID'),
      machineName: z.string().describe('Machine name'),
      appName: z.string().describe('App the machine belongs to'),
      previousState: z.string().describe('Previous state of the machine'),
      currentState: z.string().describe('New state of the machine'),
      region: z.string().describe('Region of the machine'),
      instanceId: z.string().describe('Instance ID'),
      updatedAt: z.string().describe('When the state changed')
    })
  )
  .output(
    z.object({
      machineId: z.string().describe('Machine identifier'),
      machineName: z.string().describe('Machine name'),
      appName: z.string().describe('App the machine belongs to'),
      previousState: z.string().describe('Previous machine state'),
      currentState: z.string().describe('New machine state'),
      region: z.string().describe('Region of the machine'),
      instanceId: z.string().describe('Instance ID of the machine'),
      updatedAt: z.string().describe('When the state change was detected')
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

      let previousStates: Record<string, string> =
        (ctx.state?.machineStates as Record<string, string>) || {};
      let inputs: Array<{
        machineId: string;
        machineName: string;
        appName: string;
        previousState: string;
        currentState: string;
        region: string;
        instanceId: string;
        updatedAt: string;
      }> = [];

      let currentStates: Record<string, string> = {};

      for (let machine of machines) {
        currentStates[machine.machineId] = machine.state;
        let prevState = previousStates[machine.machineId];

        if (prevState !== undefined && prevState !== machine.state) {
          inputs.push({
            machineId: machine.machineId,
            machineName: machine.machineName,
            appName,
            previousState: prevState,
            currentState: machine.state,
            region: machine.region,
            instanceId: machine.instanceId,
            updatedAt: machine.updatedAt || new Date().toISOString()
          });
        }
      }

      return {
        inputs,
        updatedState: {
          machineStates: currentStates
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `machine.${ctx.input.currentState}`,
        id: `${ctx.input.machineId}-${ctx.input.currentState}-${ctx.input.updatedAt}`,
        output: {
          machineId: ctx.input.machineId,
          machineName: ctx.input.machineName,
          appName: ctx.input.appName,
          previousState: ctx.input.previousState,
          currentState: ctx.input.currentState,
          region: ctx.input.region,
          instanceId: ctx.input.instanceId,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
