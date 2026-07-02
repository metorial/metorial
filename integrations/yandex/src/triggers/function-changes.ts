import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import * as functions from '../lib/functions';
import { spec } from '../spec';

export let functionChanges = SlateTrigger.create(spec, {
  name: 'Function Changes',
  key: 'function_changes',
  description:
    'Triggers when serverless functions are created, updated, or deleted in a Yandex Cloud Functions folder.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'status_changed', 'deleted'])
        .describe('Type of change detected'),
      eventId: z.string().describe('Unique event identifier'),
      functionId: z.string().describe('Function ID'),
      name: z.string().optional().describe('Function name'),
      status: z.string().optional().describe('Current function status'),
      previousStatus: z.string().optional().describe('Previous function status'),
      httpInvokeUrl: z.string().optional().describe('HTTP invoke URL'),
      folderId: z.string().optional().describe('Folder ID'),
      createdAt: z.string().optional().describe('Function creation timestamp')
    })
  )
  .output(
    z.object({
      functionId: z.string().describe('Function ID'),
      name: z.string().optional().describe('Function name'),
      status: z.string().optional().describe('Current function status'),
      previousStatus: z.string().optional().describe('Previous status'),
      httpInvokeUrl: z.string().optional().describe('HTTP invoke URL'),
      folderId: z.string().optional().describe('Folder ID'),
      createdAt: z.string().optional().describe('Function creation timestamp'),
      labels: z.record(z.string(), z.string()).optional().describe('Function labels')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let folderId = ctx.config.folderId;
      if (!folderId) return { inputs: [], updatedState: ctx.state };

      let result = await functions.listFunctions(ctx.auth, folderId, 1000);
      let fns: any[] = result.functions || [];

      let previousState: Record<string, string> = ctx.state?.functionStatuses || {};
      let knownIds: Set<string> = new Set(Object.keys(previousState));
      let inputs: any[] = [];
      let newState: Record<string, string> = {};

      for (let fn of fns) {
        let id = fn.id;
        newState[id] = fn.status;

        if (!knownIds.has(id)) {
          inputs.push({
            eventType: 'created' as const,
            eventId: `${id}-created-${Date.now()}`,
            functionId: id,
            name: fn.name,
            status: fn.status,
            httpInvokeUrl: fn.httpInvokeUrl,
            folderId: fn.folderId,
            createdAt: fn.createdAt
          });
        } else if (previousState[id] !== fn.status) {
          inputs.push({
            eventType: 'status_changed' as const,
            eventId: `${id}-status-${Date.now()}`,
            functionId: id,
            name: fn.name,
            status: fn.status,
            previousStatus: previousState[id],
            httpInvokeUrl: fn.httpInvokeUrl,
            folderId: fn.folderId,
            createdAt: fn.createdAt
          });
        }
      }

      let currentIds = new Set(fns.map((f: any) => f.id));
      for (let id of knownIds) {
        if (!currentIds.has(id)) {
          inputs.push({
            eventType: 'deleted' as const,
            eventId: `${id}-deleted-${Date.now()}`,
            functionId: id,
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
          functionStatuses: newState
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `function.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          functionId: ctx.input.functionId,
          name: ctx.input.name,
          status: ctx.input.status,
          previousStatus: ctx.input.previousStatus,
          httpInvokeUrl: ctx.input.httpInvokeUrl,
          folderId: ctx.input.folderId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
