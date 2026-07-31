import { createTextAttachment, SlateTool } from 'slates';
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
      viewId: z.string(),
      contentType: z.literal('text/csv'),
      byteSize: z.number().int().nonnegative(),
      csvData: z
        .string()
        .optional()
        .describe(
          'Legacy inline CSV field; omitted because the export is returned as a downloadable file'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let csvData = await client.getViewData(ctx.input.viewId);

    return {
      output: {
        viewId: ctx.input.viewId,
        contentType: 'text/csv' as const,
        byteSize: Buffer.byteLength(csvData, 'utf8')
      },
      attachments: [createTextAttachment(csvData, 'text/csv')],
      message: `Exported CSV data from view \`${ctx.input.viewId}\`.`
    };
  })
  .build();
