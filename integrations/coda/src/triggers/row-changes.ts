import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let rowChangesTrigger = SlateTrigger.create(spec, {
  name: 'Row Changes',
  key: 'row_changes',
  description:
    'Triggers when rows are added, updated, or removed in a Coda doc table. Receives webhook notifications for row-level changes. Configure the webhook URL in your Coda doc settings.'
})
  .input(
    z.object({
      eventType: z
        .enum(['rowAdded', 'rowUpdated', 'rowRemoved'])
        .describe('Type of row change event'),
      docId: z.string().describe('ID of the doc where the event occurred'),
      tableId: z.string().optional().describe('ID of the table where the event occurred'),
      rowId: z.string().optional().describe('ID of the affected row'),
      eventId: z.string().describe('Unique ID for deduplication'),
      webhookPayload: z.any().describe('Raw event payload from Coda')
    })
  )
  .output(
    z.object({
      docId: z.string().describe('ID of the doc'),
      tableId: z.string().optional().describe('ID of the table'),
      rowId: z.string().optional().describe('ID of the affected row'),
      rowName: z.string().optional().describe('Name of the affected row'),
      cells: z
        .record(z.string(), z.any())
        .optional()
        .describe('Cell values for the affected row (when available)'),
      browserLink: z.string().optional().describe('URL to the affected row')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.input.request.json();
      } catch {
        return { inputs: [] };
      }

      // Coda webhook payloads may contain a batch of events or a single event
      let events: any[] = Array.isArray(data) ? data : [data];

      let inputs = events
        .filter((event: any) => event.type)
        .map((event: any, index: number) => ({
          eventType: event.type as 'rowAdded' | 'rowUpdated' | 'rowRemoved',
          docId: event.docId || '',
          tableId: event.tableId,
          rowId: event.rowId,
          eventId:
            event.id || `${event.docId}-${event.type}-${event.rowId || index}-${Date.now()}`,
          webhookPayload: event
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let row: any = null;

      // For rowAdded and rowUpdated, try to fetch the full row data
      if (
        ctx.input.eventType !== 'rowRemoved' &&
        ctx.input.docId &&
        ctx.input.tableId &&
        ctx.input.rowId
      ) {
        try {
          let client = new Client({ token: ctx.auth.token });
          row = await client.getRow(ctx.input.docId, ctx.input.tableId, ctx.input.rowId, {
            useColumnNames: true
          });
        } catch {
          // Row may not be accessible or may have been deleted since the event
        }
      }

      return {
        type: `row.${ctx.input.eventType === 'rowAdded' ? 'added' : ctx.input.eventType === 'rowUpdated' ? 'updated' : 'removed'}`,
        id: ctx.input.eventId,
        output: {
          docId: ctx.input.docId,
          tableId: ctx.input.tableId,
          rowId: ctx.input.rowId,
          rowName: row?.name,
          cells: row?.values,
          browserLink: row?.browserLink
        }
      };
    }
  })
  .build();
