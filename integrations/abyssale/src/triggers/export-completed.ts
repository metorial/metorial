import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let exportCompleted = SlateTrigger.create(spec, {
  name: 'Export Completed',
  key: 'export_completed',
  description:
    'Triggered when a design export (ZIP file of multiple banners) has finished processing and is available for download. Delivered to the callback URL provided during the export request.'
})
  .input(
    z.object({
      exportId: z.string().describe('Export request ID'),
      archiveUrl: z.string().describe('URL to download the ZIP archive'),
      rawPayload: z.record(z.string(), z.any()).describe('Raw event payload')
    })
  )
  .output(
    z.object({
      exportId: z.string().describe('Export request ID'),
      archiveUrl: z.string().describe('URL to download the ZIP archive')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            exportId: data.export_id || data.id || '',
            archiveUrl: data.archive_url || '',
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'export.completed',
        id: ctx.input.exportId,
        output: {
          exportId: ctx.input.exportId,
          archiveUrl: ctx.input.archiveUrl
        }
      };
    }
  })
  .build();
