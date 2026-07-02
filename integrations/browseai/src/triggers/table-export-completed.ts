import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let tableExportCompleted = SlateTrigger.create(spec, {
  name: 'Table Export Completed',
  key: 'table_export_completed',
  description:
    'Triggers when a table export finishes successfully. Includes the export format, download URL, and record count. Currently in Beta.'
})
  .input(
    z.object({
      event: z.string().describe('The event type'),
      robotId: z.string().describe('ID of the robot'),
      exportId: z.string().describe('ID of the completed export'),
      format: z.string().describe('Export format (e.g., "csv")'),
      downloadUrl: z.string().describe('URL to download the exported file'),
      recordCount: z.number().describe('Number of records in the export'),
      finishedAt: z.number().optional().describe('Unix timestamp when the export finished')
    })
  )
  .output(
    z.object({
      robotId: z.string().describe('ID of the robot'),
      exportId: z.string().describe('ID of the completed export'),
      format: z.string().describe('Export format (e.g., "csv")'),
      downloadUrl: z.string().describe('URL to download the exported file'),
      recordCount: z.number().describe('Number of records in the export'),
      finishedAt: z.number().optional().describe('Unix timestamp when the export finished')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let exportData = data.export ?? {};

      return {
        inputs: [
          {
            event: data.event ?? 'tableExportFinishedSuccessfully',
            robotId: data.robotId ?? '',
            exportId: exportData.id ?? '',
            format: exportData.format ?? '',
            downloadUrl: exportData.downloadUrl ?? '',
            recordCount: exportData.recordCount ?? 0,
            finishedAt: exportData.finishedAt
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'table_export.finished_successfully',
        id: ctx.input.exportId,
        output: {
          robotId: ctx.input.robotId,
          exportId: ctx.input.exportId,
          format: ctx.input.format,
          downloadUrl: ctx.input.downloadUrl,
          recordCount: ctx.input.recordCount,
          finishedAt: ctx.input.finishedAt
        }
      };
    }
  })
  .build();
