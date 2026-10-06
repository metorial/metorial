import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deliverFiles } from '../lib/files';
import { buildFileSource, fileSourceSchema } from '../lib/validation';
import { spec } from '../spec';

export let mergePdf = SlateTool.create(spec, {
  name: 'Merge PDFs',
  key: 'merge_pdf',
  description: `Merge two or more PDF files into a single PDF document.
Files are merged in the order provided. Supports URLs, file IDs, and base64-encoded content.`,
  instructions: [
    'Provide at least 2 PDF files to merge.',
    'Files are combined in the order they appear in the array.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      files: z.array(fileSourceSchema).min(2).describe('PDF files to merge (minimum 2)'),
      storeFile: z
        .boolean()
        .optional()
        .default(true)
        .describe('Store merged file on ConvertAPI server for download')
    })
  )
  .output(
    z.object({
      conversionCost: z.number().describe('Number of conversion credits consumed'),
      conversionTime: z
        .number()
        .optional()
        .describe('Provider-reported legacy duration, when present'),
      fileName: z.string().describe('Name of the merged PDF'),
      fileSize: z.number().describe('Size of the merged PDF in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the merged PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });

    let fileSources = ctx.input.files.map(f => buildFileSource(f));

    let rawResult = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'merge',
      files: fileSources,
      storeFile: ctx.input.storeFile
    });
    let result = await deliverFiles(ctx, rawResult);

    let merged = result.files[0]!;
    return {
      output: {
        conversionCost: result.conversionCost,
        conversionTime: result.conversionTime,
        fileName: merged.fileName,
        fileSize: merged.fileSize,
        fileId: merged.fileId,
        url: merged.url
      },
      message: `Merged **${ctx.input.files.length} PDFs** into \`${merged.fileName}\` (${merged.fileSize} bytes).`
    };
  })
  .build();
