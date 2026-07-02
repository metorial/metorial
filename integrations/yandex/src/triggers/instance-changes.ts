import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import * as compute from '../lib/compute';
import { spec } from '../spec';

export let instanceChanges = SlateTrigger.create(spec, {
  name: 'Instance Changes',
  key: 'instance_changes',
  description:
    'Triggers when VM instances are created, updated, or change status in a Yandex Compute Cloud folder.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated', 'status_changed', 'deleted'])
        .describe('Type of change detected'),
      eventId: z.string().describe('Unique event identifier'),
      instanceId: z.string().describe('Instance ID'),
      name: z.string().optional().describe('Instance name'),
      status: z.string().optional().describe('Current instance status'),
      previousStatus: z
        .string()
        .optional()
        .describe('Previous instance status (for status changes)'),
      zoneId: z.string().optional().describe('Availability zone'),
      folderId: z.string().optional().describe('Folder ID'),
      createdAt: z.string().optional().describe('Instance creation timestamp')
    })
  )
  .output(
    z.object({
      instanceId: z.string().describe('Instance ID'),
      name: z.string().optional().describe('Instance name'),
      status: z.string().optional().describe('Current instance status'),
      previousStatus: z.string().optional().describe('Previous status (for status changes)'),
      zoneId: z.string().optional().describe('Availability zone'),
      platformId: z.string().optional().describe('Platform ID'),
      folderId: z.string().optional().describe('Folder ID'),
      createdAt: z.string().optional().describe('Instance creation timestamp'),
      labels: z.record(z.string(), z.string()).optional().describe('Instance labels')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let folderId = ctx.config.folderId;
      if (!folderId) return { inputs: [], updatedState: ctx.state };

      let result = await compute.listInstances(ctx.auth, folderId, 1000);
      let instances: any[] = result.instances || [];

      let previousState: Record<string, string> = ctx.state?.instanceStatuses || {};
      let knownIds: Set<string> = new Set(Object.keys(previousState));
      let inputs: any[] = [];
      let newState: Record<string, string> = {};

      for (let instance of instances) {
        let id = instance.id;
        newState[id] = instance.status;

        if (!knownIds.has(id)) {
          inputs.push({
            eventType: 'created' as const,
            eventId: `${id}-created-${Date.now()}`,
            instanceId: id,
            name: instance.name,
            status: instance.status,
            zoneId: instance.zoneId,
            folderId: instance.folderId,
            createdAt: instance.createdAt
          });
        } else if (previousState[id] !== instance.status) {
          inputs.push({
            eventType: 'status_changed' as const,
            eventId: `${id}-status-${Date.now()}`,
            instanceId: id,
            name: instance.name,
            status: instance.status,
            previousStatus: previousState[id],
            zoneId: instance.zoneId,
            folderId: instance.folderId,
            createdAt: instance.createdAt
          });
        }
      }

      let currentIds = new Set(instances.map((i: any) => i.id));
      for (let id of knownIds) {
        if (!currentIds.has(id)) {
          inputs.push({
            eventType: 'deleted' as const,
            eventId: `${id}-deleted-${Date.now()}`,
            instanceId: id,
            name: undefined,
            status: 'DELETED',
            previousStatus: previousState[id],
            folderId
          });
        }
      }

      return {
        inputs,
        updatedState: {
          instanceStatuses: newState
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `instance.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          instanceId: ctx.input.instanceId,
          name: ctx.input.name,
          status: ctx.input.status,
          previousStatus: ctx.input.previousStatus,
          zoneId: ctx.input.zoneId,
          folderId: ctx.input.folderId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
