import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TrayGraphqlClient } from '../lib/client';
import { spec } from '../spec';

export let solutionInstanceChanges = SlateTrigger.create(spec, {
  name: 'Solution Instance Changes',
  key: 'solution_instance_changes',
  description:
    '[Polling fallback] Polls for changes to solution instances (new instances created, instances enabled/disabled, or instances removed). Detects differences by comparing the current state against the previous snapshot.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change detected'),
      eventId: z.string().describe('Unique event identifier'),
      solutionInstanceId: z.string().describe('ID of the affected solution instance'),
      instanceName: z.string().describe('Name of the solution instance'),
      enabled: z.boolean().describe('Current enabled state')
    })
  )
  .output(
    z.object({
      solutionInstanceId: z.string().describe('ID of the affected solution instance'),
      instanceName: z.string().describe('Name of the solution instance'),
      enabled: z.boolean().describe('Current enabled state'),
      changeType: z.string().describe('Type of change: created, updated, or deleted')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TrayGraphqlClient({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let currentInstances = await client.listSolutionInstances();

      let previousMap: Record<string, { name: string; enabled: boolean }> =
        (ctx.state as any)?.instanceMap || {};
      let currentMap: Record<string, { name: string; enabled: boolean }> = {};
      let inputs: Array<{
        changeType: 'created' | 'updated' | 'deleted';
        eventId: string;
        solutionInstanceId: string;
        instanceName: string;
        enabled: boolean;
      }> = [];

      for (let inst of currentInstances) {
        currentMap[inst.solutionInstanceId] = { name: inst.name, enabled: inst.enabled };

        let prev = previousMap[inst.solutionInstanceId];
        if (!prev) {
          // Only emit created events if we have a previous state (not first poll)
          if (Object.keys(previousMap).length > 0) {
            inputs.push({
              changeType: 'created',
              eventId: `si_created_${inst.solutionInstanceId}_${Date.now()}`,
              solutionInstanceId: inst.solutionInstanceId,
              instanceName: inst.name,
              enabled: inst.enabled
            });
          }
        } else if (prev.name !== inst.name || prev.enabled !== inst.enabled) {
          inputs.push({
            changeType: 'updated',
            eventId: `si_updated_${inst.solutionInstanceId}_${Date.now()}`,
            solutionInstanceId: inst.solutionInstanceId,
            instanceName: inst.name,
            enabled: inst.enabled
          });
        }
      }

      // Detect deleted instances (only if we have a previous state)
      if (Object.keys(previousMap).length > 0) {
        for (let prevId of Object.keys(previousMap)) {
          if (!currentMap[prevId]) {
            inputs.push({
              changeType: 'deleted',
              eventId: `si_deleted_${prevId}_${Date.now()}`,
              solutionInstanceId: prevId,
              instanceName: previousMap[prevId]?.name || '',
              enabled: false
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          instanceMap: currentMap
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `solution_instance.${ctx.input.changeType}`,
        id: ctx.input.eventId,
        output: {
          solutionInstanceId: ctx.input.solutionInstanceId,
          instanceName: ctx.input.instanceName,
          enabled: ctx.input.enabled,
          changeType: ctx.input.changeType
        }
      };
    }
  })
  .build();
