import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { ProjectClient } from '../lib/project-client';
import { spec } from '../spec';

export let databaseChangesTrigger = SlateTrigger.create(spec, {
  name: 'Database Changes',
  key: 'database_changes',
  description:
    '[Polling fallback] Polls for new, updated, or deleted rows in a Supabase table by tracking changes since the last poll. Requires a timestamp column (e.g., created_at or updated_at) to detect changes.'
})
  .input(
    z.object({
      eventType: z.enum(['inserted', 'updated']).describe('Type of change detected'),
      row: z.record(z.string(), z.any()).describe('The row data'),
      table: z.string().describe('Table name'),
      projectRef: z.string().describe('Project reference ID'),
      rowId: z.string().describe('Unique identifier of the row')
    })
  )
  .output(
    z.object({
      table: z.string().describe('Table name'),
      projectRef: z.string().describe('Project reference ID'),
      row: z.record(z.string(), z.any()).describe('The row data'),
      rowId: z.string().describe('Unique row identifier')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let state = ctx.state ?? {};
      let projectRef = ctx.config.projectRef;
      if (!projectRef) {
        return { inputs: [], updatedState: state };
      }

      let table = state.table;
      let timestampColumn = state.timestampColumn ?? 'updated_at';
      let idColumn = state.idColumn ?? 'id';
      let lastPollTimestamp = state.lastPollTimestamp;

      if (!table) {
        return { inputs: [], updatedState: state };
      }

      let mgmt = new ManagementClient(ctx.auth.token);
      let keys = await mgmt.getProjectApiKeys(projectRef);
      let serviceKey = (Array.isArray(keys) ? keys : []).find(
        (k: any) => k.name === 'service_role'
      );
      let apiKey = serviceKey?.api_key;

      if (!apiKey) {
        return { inputs: [], updatedState: state };
      }

      let projectClient = new ProjectClient(projectRef, apiKey);

      let filters: Record<string, string> = {};
      if (lastPollTimestamp) {
        filters[timestampColumn] = `gt.${lastPollTimestamp}`;
      }

      let rows = await projectClient.selectRows(table, {
        filters,
        order: `${timestampColumn}.asc`,
        limit: 100
      });

      let resultRows = Array.isArray(rows) ? rows : [];

      let newLastPollTimestamp = lastPollTimestamp;
      if (resultRows.length > 0) {
        let lastRow = resultRows[resultRows.length - 1];
        newLastPollTimestamp = lastRow[timestampColumn] ?? newLastPollTimestamp;
      }

      let inputs = resultRows.map((row: any) => ({
        eventType: lastPollTimestamp ? ('updated' as const) : ('inserted' as const),
        row,
        table,
        projectRef,
        rowId: String(row[idColumn] ?? '')
      }));

      return {
        inputs,
        updatedState: {
          ...state,
          lastPollTimestamp: newLastPollTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `row.${ctx.input.eventType}`,
        id: `${ctx.input.table}-${ctx.input.rowId}-${ctx.input.eventType}`,
        output: {
          table: ctx.input.table,
          projectRef: ctx.input.projectRef,
          row: ctx.input.row,
          rowId: ctx.input.rowId
        }
      };
    }
  })
  .build();
