import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileSourceSchema = z
  .object({
    url: z.string().optional().describe('Public URL of the PDF file'),
    fileId: z.string().optional().describe('ConvertAPI file ID of a previously uploaded PDF'),
    base64Data: z.string().optional().describe('Base64-encoded PDF content'),
    fileName: z.string().optional().describe('File name (required when using base64Data)')
  })
  .describe(
    'PDF file source — provide exactly one of: url, fileId, or base64Data (with fileName)'
  );

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
      conversionTime: z.number().describe('Merge duration in seconds'),
      fileName: z.string().describe('Name of the merged PDF'),
      fileSize: z.number().describe('Size of the merged PDF in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the merged PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let fileSources = ctx.input.files.map(f => buildFileSource(f));

    let result = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'merge',
      files: fileSources,
      storeFile: ctx.input.storeFile
    });

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
      message: `Merged **${ctx.input.files.length} PDFs** into \`${merged.fileName}\` (${formatBytes(merged.fileSize)}) in ${result.conversionTime}s.`
    };
  })
  .build();

function buildFileSource(file: {
  url?: string;
  fileId?: string;
  base64Data?: string;
  fileName?: string;
}) {
  if (file.url) {
    return { type: 'url' as const, url: file.url };
  }
  if (file.fileId) {
    return { type: 'fileId' as const, fileId: file.fileId };
  }
  if (file.base64Data && file.fileName) {
    return { type: 'base64' as const, fileName: file.fileName, data: file.base64Data };
  }
  throw new Error('Provide exactly one of: url, fileId, or base64Data (with fileName)');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
