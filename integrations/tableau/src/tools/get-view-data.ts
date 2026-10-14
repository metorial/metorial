import { SlateTool } from 'slates';
import { z } from 'zod';
import { addViewExportFile, createClient } from '../lib/helpers';
import { spec } from '../spec';

let filterValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export let getViewData = SlateTool.create(spec, {
  name: 'Get View Data',
  key: 'get_view_data',
  description: `Export the underlying data from a Tableau view as a downloadable CSV file. Useful for retrieving the tabular data behind a dashboard visualization.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      viewId: z.string().describe('LUID of the view to export data from'),
      filters: z
        .record(z.string(), filterValueSchema)
        .optional()
        .describe('View filters keyed by field name; sent as vf_<field>=value'),
      maxAgeMinutes: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum age in minutes of cached data Tableau may return')
    })
  )
  .output(
    z.object({
      viewId: z.string(),
      contentType: z.literal('text/csv'),
      byteSize: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          'Legacy CSV size field; omitted because the size is only known once the file is downloaded'
        ),
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
    let view = await client.getView(ctx.input.viewId);
    await addViewExportFile(
      ctx,
      client.viewExportFile(ctx.input.viewId, 'csv', {
        filters: ctx.input.filters,
        maxAgeMinutes: ctx.input.maxAgeMinutes
      })
    );

    let label = view?.name ? `**${view.name}**` : `\`${ctx.input.viewId}\``;
    return {
      output: {
        viewId: ctx.input.viewId,
        contentType: 'text/csv' as const
      },
      message: `Prepared CSV data from view ${label} for download.`
    };
  })
  .build();
