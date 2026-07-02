import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let listRowUpdated = SlateTrigger.create(spec, {
  name: 'List Row Updated',
  key: 'list_row_updated',
  description:
    'Triggers instantly when an existing row in a conversion list is updated. Configure the webhook URL and secret token in your Sidetracker application settings.'
})
  .input(
    z.object({
      listId: z.string().describe('Unique ID of the list that was modified'),
      rowData: z.record(z.string(), z.unknown()).describe('Row data from the webhook payload')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Unique ID of the list the row belongs to'),
      row: z.record(z.string(), z.unknown()).describe('The updated row data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      return {
        inputs: [
          {
            listId: String(data.unique_id ?? data.list_id ?? ''),
            rowData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let rowId = String(
        ctx.input.rowData.id ??
          ctx.input.rowData.row_id ??
          ctx.input.rowData.unique_id ??
          Date.now()
      );

      return {
        type: 'list_row.updated',
        id: `${ctx.input.listId}-updated-${rowId}`,
        output: {
          listId: ctx.input.listId,
          row: ctx.input.rowData
        }
      };
    }
  })
  .build();
