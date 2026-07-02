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

export let compressPdf = SlateTool.create(spec, {
  name: 'Compress PDF',
  key: 'compress_pdf',
  description: `Compress a PDF file to reduce its size while maintaining quality.
Useful for preparing documents for email, web upload, or archiving.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      file: fileSourceSchema,
      storeFile: z
        .boolean()
        .optional()
        .default(true)
        .describe('Store compressed file on ConvertAPI server for download')
    })
  )
  .output(
    z.object({
      conversionCost: z.number().describe('Number of conversion credits consumed'),
      conversionTime: z.number().describe('Compression duration in seconds'),
      fileName: z.string().describe('Name of the compressed PDF'),
      fileSize: z.number().describe('Size of the compressed PDF in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the compressed PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);

    let result = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'compress',
      files: [fileSource],
      storeFile: ctx.input.storeFile
    });

    let compressed = result.files[0]!;
    return {
      output: {
        conversionCost: result.conversionCost,
        conversionTime: result.conversionTime,
        fileName: compressed.fileName,
        fileSize: compressed.fileSize,
        fileId: compressed.fileId,
        url: compressed.url
      },
      message: `Compressed PDF to \`${compressed.fileName}\` (${formatBytes(compressed.fileSize)}) in ${result.conversionTime}s.`
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
