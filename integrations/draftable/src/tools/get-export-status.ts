import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExportStatus = SlateTool.create(spec, {
  name: 'Get Export Status',
  key: 'get_export_status',
  description: `Retrieves the status of a PDF export. Use this to poll for export completion after initiating an export with the **Export Comparison** tool. When ready, provides the download URL for the exported PDF.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      exportIdentifier: z.string().describe('Unique identifier of the export to check')
    })
  )
  .output(
    z.object({
      exportIdentifier: z.string().describe('Unique identifier of the export'),
      comparisonIdentifier: z.string().describe('Identifier of the compared documents'),
      kind: z.string().describe('The export kind'),
      ready: z.boolean().describe('Whether the export is ready for download'),
      downloadUrl: z
        .string()
        .nullable()
        .describe('URL to download the exported PDF. Available when ready is true.'),
      failed: z.boolean().describe('Whether the export processing failed'),
      errorMessage: z.string().nullable().describe('Error message if the export failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getExport(ctx.input.exportIdentifier);

    let status = result.failed ? 'failed' : result.ready ? 'ready' : 'processing';

    return {
      output: {
        exportIdentifier: result.identifier,
        comparisonIdentifier: result.comparisonIdentifier,
        kind: result.kind,
        ready: result.ready,
        downloadUrl: result.url,
        failed: result.failed,
        errorMessage: result.errorMessage
      },
      message: `Export **${result.identifier}** is **${status}**.${result.ready && result.url ? ` [Download PDF](${result.url})` : ''}`
    };
  })
  .build();
