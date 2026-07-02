import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileSourceSchema = z
  .object({
    url: z.string().optional().describe('Public URL of the file'),
    fileId: z.string().optional().describe('ConvertAPI file ID of a previously uploaded file'),
    base64Data: z.string().optional().describe('Base64-encoded file content'),
    fileName: z.string().optional().describe('File name (required when using base64Data)')
  })
  .describe(
    'File source — provide exactly one of: url, fileId, or base64Data (with fileName)'
  );

export let extractText = SlateTool.create(spec, {
  name: 'Extract Text',
  key: 'extract_text',
  description: `Extract text content from PDF documents and other file formats. Supports OCR for scanned documents.
Returns the extracted text as a plain text file. Useful for indexing, search, or text analysis.`,
  instructions: [
    'For scanned PDFs, the tool automatically applies OCR to extract text from images.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sourceFormat: z
        .string()
        .default('pdf')
        .describe('Source file format (e.g., "pdf", "docx", "pptx")'),
      file: fileSourceSchema,
      ocrEnabled: z.boolean().optional().describe('Enable OCR for scanned documents')
    })
  )
  .output(
    z.object({
      conversionCost: z.number().describe('Number of conversion credits consumed'),
      conversionTime: z.number().describe('Extraction duration in seconds'),
      fileName: z.string().describe('Name of the output text file'),
      fileSize: z.number().describe('Size of the extracted text in bytes'),
      textContent: z
        .string()
        .nullable()
        .describe('Extracted text content (base64-encoded if not directly available)'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the text file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);
    let parameters: Record<string, string> = {};

    if (ctx.input.ocrEnabled !== undefined) {
      parameters.Ocr = ctx.input.ocrEnabled ? 'true' : 'false';
    }

    let result = await client.convert({
      sourceFormat: ctx.input.sourceFormat,
      destinationFormat: 'txt',
      files: [fileSource],
      storeFile: true,
      parameters
    });

    let textFile = result.files[0]!;
    return {
      output: {
        conversionCost: result.conversionCost,
        conversionTime: result.conversionTime,
        fileName: textFile.fileName,
        fileSize: textFile.fileSize,
        textContent: textFile.fileData,
        fileId: textFile.fileId,
        url: textFile.url
      },
      message: `Extracted text from **${ctx.input.sourceFormat}** → \`${textFile.fileName}\` (${formatBytes(textFile.fileSize)}) in ${result.conversionTime}s.`
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
