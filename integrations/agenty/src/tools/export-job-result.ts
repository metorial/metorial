import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportJobResult = SlateTool.create(spec, {
  name: 'Export Job Result',
  key: 'export_job_result',
  description: `Generate a download link for job results or logs in CSV format. Useful for exporting large datasets for external processing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique identifier of the job to export.'),
      type: z
        .enum(['result', 'logs'])
        .optional()
        .describe('Type of data to export. Defaults to "result".'),
      collection: z
        .number()
        .min(1)
        .refine(Number.isInteger, 'Use a whole-number collection index.')
        .optional()
        .describe('Collection index to export.'),
      modified: z
        .number()
        .min(0)
        .max(1)
        .refine(Number.isInteger, 'Use 0 or 1.')
        .optional()
        .describe(
          'Use 1 for post-processed results when available, or 0 for original results.'
        ),
      filename: z.string().optional().describe('Custom filename for the exported file.')
    })
  )
  .output(
    z.object({
      downloadLink: z
        .string()
        .optional()
        .nullable()
        .describe('URL to download the exported CSV file.'),
      exportData: z.any().optional().nullable().describe('Export response data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let download = await client.getExportDownload(ctx.input.jobId, {
      type: ctx.input.type,
      collection: ctx.input.collection,
      modified: ctx.input.modified,
      filename: ctx.input.filename
    });

    // Export links are signed, but Agenty does not document their TTL.
    // Renew on every later download rather than assuming an expiry duration.
    await ctx.addAttachment({
      type: 'url',
      url: download.url,
      mimeType: 'text/csv',
      refreshReference: { ...ctx.input },
      refreshAt: new Date().toISOString()
    });
    let result = download.result;

    return {
      output: {
        downloadLink: download.url,
        exportData: result
      },
      message: `Export generated for job **${ctx.input.jobId}** (${ctx.input.type || 'result'}).${result.download_link || result.downloadlink ? ` Download link available.` : ''}`
    };
  })
  .build();
