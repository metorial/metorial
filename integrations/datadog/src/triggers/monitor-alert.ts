import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let monitorAlertTrigger = SlateTrigger.create(spec, {
  name: 'Monitor State Change',
  key: 'monitor_state_change',
  description:
    'Triggers when a Datadog monitor changes state (e.g., alert, warning, recovery, no data). Polls monitors for state transitions.'
})
  .input(
    z.object({
      monitorId: z.number().describe('Monitor ID'),
      monitorName: z.string().describe('Monitor name'),
      monitorType: z.string().describe('Monitor type'),
      overallState: z.string().describe('Current overall state of the monitor'),
      query: z.string().describe('Monitor query'),
      message: z.string().optional().describe('Monitor notification message'),
      tags: z.array(z.string()).optional().describe('Monitor tags'),
      priority: z.number().optional().describe('Monitor priority'),
      modified: z.string().optional().describe('Last modification timestamp')
    })
  )
  .output(
    z.object({
      monitorId: z.number().describe('Monitor ID'),
      monitorName: z.string().describe('Monitor name'),
      monitorType: z.string().describe('Monitor type'),
      currentState: z.string().describe('Current state of the monitor'),
      query: z.string().describe('Monitor query'),
      message: z.string().optional().describe('Monitor notification message'),
      tags: z.array(z.string()).optional().describe('Monitor tags'),
      priority: z.number().optional().describe('Monitor priority'),
      modified: z.string().optional().describe('Last modification timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let state = ctx.state as { monitorStates?: Record<string, string> } | null;
      let previousStates = state?.monitorStates || {};

      let monitors = await client.listMonitors({
        groupStates: 'all',
        pageSize: 1000
      });

      let inputs: Array<{
        monitorId: number;
        monitorName: string;
        monitorType: string;
        overallState: string;
        query: string;
        message?: string;
        tags?: string[];
        priority?: number;
        modified?: string;
      }> = [];

      let newStates: Record<string, string> = {};

      for (let monitor of monitors) {
        let id = String(monitor.id);
        let currentState = monitor.overall_state || 'unknown';
        newStates[id] = currentState;

        let previousState = previousStates[id];
        if (previousState !== undefined && previousState !== currentState) {
          inputs.push({
            monitorId: monitor.id!,
            monitorName: monitor.name,
            monitorType: monitor.type,
            overallState: currentState,
            query: monitor.query,
            message: monitor.message,
            tags: monitor.tags,
            priority: monitor.priority,
            modified: monitor.modified
          });
        }
      }

      return {
        inputs,
        updatedState: {
          monitorStates: newStates
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `monitor.${ctx.input.overallState.toLowerCase().replace(/\s+/g, '_')}`,
        id: `${ctx.input.monitorId}-${ctx.input.overallState}-${ctx.input.modified || Date.now()}`,
        output: {
          monitorId: ctx.input.monitorId,
          monitorName: ctx.input.monitorName,
          monitorType: ctx.input.monitorType,
          currentState: ctx.input.overallState,
          query: ctx.input.query,
          message: ctx.input.message,
          tags: ctx.input.tags,
          priority: ctx.input.priority,
          modified: ctx.input.modified
        }
      };
    }
  })
  .build();
