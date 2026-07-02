import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let incidentUpdates = SlateTrigger.create(spec, {
  name: 'Incident Updates',
  key: 'incident_updates',
  description:
    'Polls for new or updated incidents in ServiceNow. Detects new incidents, state changes, priority changes, assignments, and comments/work notes.'
})
  .input(
    z.object({
      incidentId: z.string().describe('sys_id of the incident'),
      updatedOn: z.string().describe('Timestamp when the incident was last updated'),
      createdOn: z.string().describe('Timestamp when the incident was created'),
      isNew: z.boolean().describe('Whether this is a newly created incident'),
      record: z.record(z.string(), z.any()).describe('Full incident record')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('sys_id of the incident'),
      incidentNumber: z.string().optional().describe('Incident number (e.g. INC0010001)'),
      shortDescription: z.string().optional().describe('Short description of the incident'),
      state: z.string().optional().describe('Current incident state'),
      priority: z.string().optional().describe('Incident priority'),
      impact: z.string().optional().describe('Incident impact'),
      urgency: z.string().optional().describe('Incident urgency'),
      assignedTo: z.string().optional().describe('Assigned user'),
      assignmentGroup: z.string().optional().describe('Assignment group'),
      caller: z.string().optional().describe('Caller/reporter'),
      category: z.string().optional().describe('Incident category'),
      updatedBy: z.string().optional().describe('User who last updated the incident'),
      updatedOn: z
        .string()
        .optional()
        .describe('Timestamp when the incident was last updated'),
      createdOn: z.string().optional().describe('Timestamp when the incident was created'),
      record: z.record(z.string(), z.any()).describe('Full incident record')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.auth, ctx.config);

      let state = ctx.input.state as Record<string, any> | undefined;
      let lastPollTime = state?.lastPollTime as string | undefined;
      let now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      let queryParts: string[] = [];

      if (lastPollTime) {
        queryParts.push(`sys_updated_on>${lastPollTime}`);
      }

      if (state?.query) {
        queryParts.push(state.query as string);
      }

      let query = queryParts.length > 0 ? queryParts.join('^') : undefined;

      let result = await client.getRecords('incident', {
        query,
        limit: 100,
        orderBy: 'sys_updated_on',
        orderDirection: 'desc',
        displayValue: 'all'
      });

      let inputs = result.records.map(record => {
        let r = record as any;
        let createdOn = r.sys_created_on?.display_value || r.sys_created_on || '';
        let updatedOn = r.sys_updated_on?.display_value || r.sys_updated_on || '';
        let isNew = !lastPollTime || createdOn > lastPollTime;

        return {
          incidentId: record.sys_id,
          updatedOn,
          createdOn,
          isNew,
          record
        };
      });

      return {
        inputs,
        updatedState: {
          lastPollTime: now,
          query: state?.query
        }
      };
    },

    handleEvent: async ctx => {
      let r = ctx.input.record as any;
      let eventType = ctx.input.isNew ? 'created' : 'updated';

      return {
        type: `incident.${eventType}`,
        id: `${ctx.input.incidentId}-${ctx.input.updatedOn}`,
        output: {
          incidentId: ctx.input.incidentId,
          incidentNumber: r.number?.display_value || r.number,
          shortDescription: r.short_description?.display_value || r.short_description,
          state: r.state?.display_value || r.state,
          priority: r.priority?.display_value || r.priority,
          impact: r.impact?.display_value || r.impact,
          urgency: r.urgency?.display_value || r.urgency,
          assignedTo: r.assigned_to?.display_value || r.assigned_to,
          assignmentGroup: r.assignment_group?.display_value || r.assignment_group,
          caller: r.caller_id?.display_value || r.caller_id,
          category: r.category?.display_value || r.category,
          updatedBy: r.sys_updated_by?.display_value || r.sys_updated_by,
          updatedOn: ctx.input.updatedOn,
          createdOn: ctx.input.createdOn,
          record: ctx.input.record
        }
      };
    }
  })
  .build();
