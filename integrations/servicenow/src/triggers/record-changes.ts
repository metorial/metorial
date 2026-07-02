import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let recordChanges = SlateTrigger.create(spec, {
  name: 'Record Changes',
  key: 'record_changes',
  description:
    'Polls for new or updated records in a specified ServiceNow table. Detects record creation and modification based on sys_updated_on timestamps.'
})
  .input(
    z.object({
      recordId: z.string().describe('sys_id of the changed record'),
      tableName: z.string().describe('Table the record belongs to'),
      updatedOn: z.string().describe('Timestamp when the record was last updated'),
      createdOn: z.string().describe('Timestamp when the record was created'),
      isNew: z.boolean().describe('Whether this is a newly created record'),
      record: z.record(z.string(), z.any()).describe('Full record data')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('sys_id of the changed record'),
      tableName: z.string().describe('Table the record belongs to'),
      number: z.string().optional().describe('Record number (e.g. INC0010001)'),
      shortDescription: z
        .string()
        .optional()
        .describe('Short description or name of the record'),
      state: z.string().optional().describe('Current state of the record'),
      priority: z.string().optional().describe('Priority of the record'),
      assignedTo: z.string().optional().describe('Assigned user'),
      assignmentGroup: z.string().optional().describe('Assignment group'),
      updatedBy: z.string().optional().describe('User who last updated the record'),
      updatedOn: z.string().optional().describe('Timestamp when the record was last updated'),
      createdOn: z.string().optional().describe('Timestamp when the record was created'),
      record: z.record(z.string(), z.any()).describe('Full record data')
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

      let tableName = state?.tableName || 'incident';

      let queryParts: string[] = [];

      if (lastPollTime) {
        queryParts.push(`sys_updated_on>${lastPollTime}`);
      }

      if (state?.query) {
        queryParts.push(state.query as string);
      }

      let query = queryParts.length > 0 ? queryParts.join('^') : undefined;

      let result = await client.getRecords(tableName as string, {
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
          recordId: record.sys_id,
          tableName: tableName as string,
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
          tableName,
          query: state?.query
        }
      };
    },

    handleEvent: async ctx => {
      let r = ctx.input.record as any;
      let eventType = ctx.input.isNew ? 'created' : 'updated';

      return {
        type: `${ctx.input.tableName}.${eventType}`,
        id: `${ctx.input.recordId}-${ctx.input.updatedOn}`,
        output: {
          recordId: ctx.input.recordId,
          tableName: ctx.input.tableName,
          number: r.number?.display_value || r.number,
          shortDescription: r.short_description?.display_value || r.short_description,
          state: r.state?.display_value || r.state,
          priority: r.priority?.display_value || r.priority,
          assignedTo: r.assigned_to?.display_value || r.assigned_to,
          assignmentGroup: r.assignment_group?.display_value || r.assignment_group,
          updatedBy: r.sys_updated_by?.display_value || r.sys_updated_by,
          updatedOn: ctx.input.updatedOn,
          createdOn: ctx.input.createdOn,
          record: ctx.input.record
        }
      };
    }
  })
  .build();
