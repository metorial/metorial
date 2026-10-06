import { SlateTool } from 'slates';
import { z } from 'zod';
import { exportDownloadUrl, exportQuery, MezmoClient } from '../lib/client';
import { logFilterSchema } from '../lib/schemas';
import { spec } from '../spec';

export const exportLogs = SlateTool.create(spec, {
  name: 'Export Logs',
  key: 'export_logs',
  description:
    'Prepare filtered Mezmo logs as a downloadable JSONL file. The provider plan limits this streaming export; use Search Logs to page through larger result sets.',
  instructions: [
    'Use fixed timestamps for a reproducible export. This export does not email recipients.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(logFilterSchema)
  .output(
    z.object({
      fileName: z.string().describe('Download filename'),
      mimeType: z.string().describe('File MIME type'),
      requestedLimit: z
        .number()
        .optional()
        .describe('Requested maximum line count; actual count is determined by the provider')
    })
  )
  .handleInvocation(async ctx => {
    const query = exportQuery(ctx.input);
    const client = new MezmoClient(ctx.auth);
    // Verify access without downloading the complete export into the invocation.
    await client.exportLogs({ ...ctx.input, size: 1 });
    const fileName = `mezmo-logs-${ctx.input.from}-${ctx.input.to}.jsonl`;
    await ctx.addAttachment({
      type: 'url',
      url: exportDownloadUrl,
      query,
      headers: { Authorization: `Token ${ctx.auth.token}` },
      mimeType: 'application/x-ndjson',
      filename: fileName
    });
    return {
      output: { fileName, mimeType: 'application/x-ndjson', requestedLimit: ctx.input.size },
      message: `Prepared **${fileName}** for download.`
    };
  })
  .build();
