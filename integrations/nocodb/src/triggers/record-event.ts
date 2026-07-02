import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let recordEvent = SlateTrigger.create(spec, {
  name: 'Record Event',
  key: 'record_event',
  description:
    'Triggers when a record is inserted, updated, or deleted in a NocoDB table via webhook. Configure a webhook on your NocoDB table using the Manage Webhook tool, pointing it at the provided webhook URL.',
  instructions: [
    "Use the Manage Webhook tool to create a webhook on the desired table, setting the notificationUrl to this trigger's webhook URL.",
    'Supports after.insert, after.update, and after.delete events.'
  ]
})
  .input(
    z.object({
      eventType: z.string().describe('The type of event (e.g. insert, update, delete)'),
      tableId: z.string().describe('The table ID where the event occurred'),
      rowId: z.string().describe('The row ID of the affected record'),
      recordData: z
        .record(z.string(), z.any())
        .optional()
        .describe('The record data after the event'),
      previousData: z
        .record(z.string(), z.any())
        .optional()
        .describe('The record data before the event (for updates)')
    })
  )
  .output(
    z.object({
      tableId: z.string().describe('The table ID'),
      rowId: z.string().describe('The affected row ID'),
      recordData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Record data after the event'),
      previousData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Record data before the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Determine event type from the URL path or payload
      let url = ctx.request.url;
      let eventType = 'unknown';
      if (url.includes('/insert')) eventType = 'insert';
      else if (url.includes('/update')) eventType = 'update';
      else if (url.includes('/delete')) eventType = 'delete';
      else if (body?.type) eventType = String(body.type).replace('after.', '');

      // NocoDB webhook v3 payload can be a single record or batch
      let rows = Array.isArray(body)
        ? body
        : body?.data
          ? Array.isArray(body.data)
            ? body.data
            : [body.data]
          : [body];

      let previousRows = body?.previous_data
        ? Array.isArray(body.previous_data)
          ? body.previous_data
          : [body.previous_data]
        : [];

      let inputs = rows.map((row: any, index: number) => ({
        eventType,
        tableId: String(body?.table_id ?? body?.fk_model_id ?? ''),
        rowId: String(row?.Id ?? row?.id ?? row?.nc_id ?? `${Date.now()}-${index}`),
        recordData: row,
        previousData: previousRows[index] ?? undefined
      }));

      if (inputs.length === 0) {
        inputs = [
          {
            eventType,
            tableId: String(body?.table_id ?? body?.fk_model_id ?? ''),
            rowId: String(body?.Id ?? body?.id ?? Date.now()),
            recordData: body,
            previousData: undefined
          }
        ];
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `record.${ctx.input.eventType}`,
        id: `${ctx.input.tableId}-${ctx.input.rowId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          tableId: ctx.input.tableId,
          rowId: ctx.input.rowId,
          recordData: ctx.input.recordData,
          previousData: ctx.input.previousData
        }
      };
    }
  })
  .build();
