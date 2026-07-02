import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let incidentUpdateTrigger = SlateTrigger.create(spec, {
  name: 'Incident Update',
  key: 'incident_update',
  description:
    'Triggers when a Datadog incident is created or updated. Polls incidents for changes in state, severity, or other attributes.'
})
  .input(
    z.object({
      incidentId: z.string().describe('Incident ID'),
      title: z.string().optional().describe('Incident title'),
      severity: z.string().optional().describe('Incident severity'),
      state: z.string().optional().describe('Incident state'),
      customerImpacted: z.boolean().optional().describe('Whether customers are impacted'),
      created: z.string().optional().describe('Creation timestamp'),
      modified: z.string().optional().describe('Last modification timestamp'),
      resolved: z.string().optional().describe('Resolution timestamp')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Incident ID'),
      title: z.string().optional().describe('Incident title'),
      severity: z.string().optional().describe('Incident severity'),
      state: z.string().optional().describe('Incident state'),
      customerImpacted: z.boolean().optional().describe('Whether customers are impacted'),
      created: z.string().optional().describe('Creation timestamp'),
      modified: z.string().optional().describe('Last modification timestamp'),
      resolved: z.string().optional().describe('Resolution timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let state = ctx.state as { incidentModifiedTimes?: Record<string, string> } | null;
      let previousModifiedTimes = state?.incidentModifiedTimes || {};

      let result = await client.listIncidents({ pageSize: 100 });
      let incidents = result.data || [];

      let inputs: Array<{
        incidentId: string;
        title?: string;
        severity?: string;
        state?: string;
        customerImpacted?: boolean;
        created?: string;
        modified?: string;
        resolved?: string;
      }> = [];

      let newModifiedTimes: Record<string, string> = {};

      for (let inc of incidents) {
        let id = inc.id;
        let modified = inc.attributes?.modified || '';
        newModifiedTimes[id] = modified;

        let previousModified = previousModifiedTimes[id];
        if (previousModified === undefined || previousModified !== modified) {
          inputs.push({
            incidentId: id,
            title: inc.attributes?.title,
            severity: inc.attributes?.severity,
            state: inc.attributes?.state,
            customerImpacted: inc.attributes?.customer_impacted,
            created: inc.attributes?.created,
            modified: inc.attributes?.modified,
            resolved: inc.attributes?.resolved
          });
        }
      }

      return {
        inputs,
        updatedState: {
          incidentModifiedTimes: newModifiedTimes
        }
      };
    },

    handleEvent: async ctx => {
      let state = ctx.input.state || 'active';
      return {
        type: `incident.${state.toLowerCase()}`,
        id: `${ctx.input.incidentId}-${ctx.input.modified || Date.now()}`,
        output: {
          incidentId: ctx.input.incidentId,
          title: ctx.input.title,
          severity: ctx.input.severity,
          state: ctx.input.state,
          customerImpacted: ctx.input.customerImpacted,
          created: ctx.input.created,
          modified: ctx.input.modified,
          resolved: ctx.input.resolved
        }
      };
    }
  })
  .build();
