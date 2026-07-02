import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportComparison = SlateTool.create(spec, {
  name: 'Export Comparison',
  key: 'export_comparison',
  description: `Initiates a PDF export of a comparison. Exports are processed asynchronously — use the returned export identifier to poll for completion with the **Get Export Status** tool. Four export kinds are available: left (deletions highlighted), right (insertions highlighted), combined (side-by-side), and single_page (redline view).`,
  instructions: [
    'The includeCoverPage option only applies when kind is "combined".',
    'After creating an export, poll its status using the Get Export Status tool until ready=true.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      comparisonIdentifier: z.string().describe('Identifier of the comparison to export'),
      kind: z
        .enum(['left', 'right', 'combined', 'single_page'])
        .describe(
          'Export kind: "left" shows deletions, "right" shows insertions, "combined" shows side-by-side, "single_page" shows redline view'
        ),
      includeCoverPage: z
        .boolean()
        .optional()
        .describe(
          'Whether to include a cover page. Only applies to the "combined" export kind. Defaults to true.'
        )
    })
  )
  .output(
    z.object({
      exportIdentifier: z.string().describe('Unique identifier for the export'),
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

    let result = await client.createExport({
      comparisonIdentifier: ctx.input.comparisonIdentifier,
      kind: ctx.input.kind,
      includeCoverPage: ctx.input.includeCoverPage
    });

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
      message: `Export **${result.identifier}** created for comparison **${result.comparisonIdentifier}** (kind: ${result.kind}). Status: ${result.ready ? 'ready' : 'processing'}.`
    };
  })
  .build();
