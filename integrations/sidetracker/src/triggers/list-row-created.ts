import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let listRowCreated = SlateTrigger.create(spec, {
  name: 'List Row Created',
  key: 'list_row_created',
  description:
    'Triggers instantly when a new row is added to a conversion list. Configure the webhook URL and secret token in your Sidetracker application settings.'
})
  .input(
    z.object({
      listId: z.string().describe('Unique ID of the list that was modified'),
      rowData: z.record(z.string(), z.unknown()).describe('Row data from the webhook payload')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Unique ID of the list the row was added to'),
      row: z.record(z.string(), z.unknown()).describe('The row data that was created')
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
        type: 'list_row.created',
        id: `${ctx.input.listId}-created-${rowId}`,
        output: {
          listId: ctx.input.listId,
          row: ctx.input.rowData
        }
      };
    }
  })
  .build();
