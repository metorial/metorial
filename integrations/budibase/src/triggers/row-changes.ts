import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let rowChanges = SlateTrigger.create(spec, {
  name: 'Row Changes',
  key: 'row_changes',
  description:
    'Detects new and updated rows in a Budibase table by polling. Compares row data between polls to identify created and updated rows.'
})
  .input(
    z.object({
      eventType: z.enum(['row.created', 'row.updated']).describe('Type of row change event'),
      rowId: z.string().describe('ID of the affected row'),
      tableId: z.string().describe('ID of the table the row belongs to'),
      appId: z.string().describe('ID of the application'),
      row: z.record(z.string(), z.any()).describe('Full row data')
    })
  )
  .output(
    z.object({
      rowId: z.string().describe('ID of the affected row'),
      tableId: z.string().describe('ID of the table'),
      appId: z.string().describe('ID of the application'),
      row: z.record(z.string(), z.any()).describe('Full row data including all fields')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let input = ctx.input as any;
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl,
        appId: input.appId
      });

      let allRows: any[] = [];
      let hasMore = true;
      let bookmark: string | number | undefined;

      while (hasMore) {
        let result = await client.searchRows(input.tableId, {
          paginate: true,
          limit: 500,
          bookmark
        });
        allRows.push(...result.rows);
        bookmark = result.bookmark;
        hasMore = result.hasNextPage === true && result.rows.length > 0;
      }

      let previousRowMap: Record<string, string> = input.state?.rowHashes || {};
      let currentRowMap: Record<string, string> = {};
      let inputs: Array<{
        eventType: 'row.created' | 'row.updated';
        rowId: string;
        tableId: string;
        appId: string;
        row: Record<string, any>;
      }> = [];

      for (let row of allRows) {
        let rowId = row._id;
        if (!rowId) continue;

        let hash = JSON.stringify(row);
        currentRowMap[rowId] = hash;

        if (!previousRowMap[rowId]) {
          if (input.state?.initialized) {
            inputs.push({
              eventType: 'row.created',
              rowId,
              tableId: input.tableId,
              appId: input.appId,
              row
            });
          }
        } else if (previousRowMap[rowId] !== hash) {
          inputs.push({
            eventType: 'row.updated',
            rowId,
            tableId: input.tableId,
            appId: input.appId,
            row
          });
        }
      }

      return {
        inputs,
        updatedState: {
          rowHashes: currentRowMap,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}:${ctx.input.rowId}:${Date.now()}`,
        output: {
          rowId: ctx.input.rowId,
          tableId: ctx.input.tableId,
          appId: ctx.input.appId,
          row: ctx.input.row
        }
      };
    }
  })
  .build();
