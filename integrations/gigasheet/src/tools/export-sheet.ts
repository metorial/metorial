import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let exportSheet = SlateTool.create(spec, {
  name: 'Export Sheet',
  key: 'export_sheet',
  description: `Create an export of a Gigasheet sheet, optionally with filters and groupings applied. The export is asynchronous — this tool returns the export handle which can be used to check status and download the result.`,
  instructions: [
    'The export is queued and processed asynchronously. Use the returned exportHandle to check status.',
    'Once the export state is "processed", use the download URL to retrieve the file.'
  ]
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet to export'),
      filterModel: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional filter model to apply to the export'),
      groupColumns: z
        .array(z.string())
        .optional()
        .describe('Optional columns to group by in the export'),
      format: z.string().optional().describe('Export format (if supported)')
    })
  )
  .output(
    z.object({
      exportResult: z
        .record(z.string(), z.unknown())
        .describe('Export creation result including the export handle')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });

    let exportResult = await client.createExport(ctx.input.sheetHandle, {
      filterModel: ctx.input.filterModel,
      groupColumns: ctx.input.groupColumns,
      format: ctx.input.format
    });

    return {
      output: { exportResult },
      message: `Export queued for sheet. Use the returned handle to check status and download when ready.`
    };
  })
  .build();
