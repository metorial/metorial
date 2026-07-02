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

export let pdfToPdfa = SlateTool.create(spec, {
  name: 'Convert to PDF/A',
  key: 'pdf_to_pdfa',
  description: `Convert a PDF document to PDF/A format for long-term archiving and compliance.
PDF/A is an ISO-standardized version of PDF designed for digital preservation of electronic documents.`,
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
        .describe('Store output file on ConvertAPI server for download')
    })
  )
  .output(
    z.object({
      conversionCost: z.number().describe('Number of conversion credits consumed'),
      conversionTime: z.number().describe('Conversion duration in seconds'),
      fileName: z.string().describe('Name of the PDF/A file'),
      fileSize: z.number().describe('Size of the PDF/A file in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the PDF/A file')
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
      destinationFormat: 'pdfa',
      files: [fileSource],
      storeFile: ctx.input.storeFile
    });

    let pdfa = result.files[0]!;
    return {
      output: {
        conversionCost: result.conversionCost,
        conversionTime: result.conversionTime,
        fileName: pdfa.fileName,
        fileSize: pdfa.fileSize,
        fileId: pdfa.fileId,
        url: pdfa.url
      },
      message: `Converted to PDF/A: \`${pdfa.fileName}\` (${formatBytes(pdfa.fileSize)}) in ${result.conversionTime}s.`
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
