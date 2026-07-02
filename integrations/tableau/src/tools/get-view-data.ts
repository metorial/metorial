import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getViewData = SlateTool.create(spec, {
  name: 'Get View Data',
  key: 'get_view_data',
  description: `Export the underlying data from a Tableau view as CSV. Useful for retrieving the tabular data behind a dashboard visualization.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      viewId: z.string().describe('LUID of the view to export data from')
    })
  )
  .output(
    z.object({
      csvData: z.string().describe('CSV content of the view data')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let csvData = await client.getViewData(ctx.input.viewId);

    return {
      output: { csvData },
      message: `Exported CSV data from view \`${ctx.input.viewId}\`.`
    };
  })
  .build();
