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
      collection: z.number().optional().describe('Collection index to export.'),
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

    let result = await client.exportJobResult(ctx.input.jobId, {
      type: ctx.input.type,
      collection: ctx.input.collection,
      filename: ctx.input.filename
    });

    return {
      output: {
        downloadLink: result.download_link || result.downloadlink || result.url,
        exportData: result
      },
      message: `Export generated for job **${ctx.input.jobId}** (${ctx.input.type || 'result'}).${result.download_link || result.downloadlink ? ` Download link available.` : ''}`
    };
  })
  .build();
