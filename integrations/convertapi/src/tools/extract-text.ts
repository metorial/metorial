import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deliverFiles } from '../lib/files';
import { buildFileSource, fileSourceSchema, invalid } from '../lib/validation';
import { spec } from '../spec';

export let extractText = SlateTool.create(spec, {
  name: 'Extract Text',
  key: 'extract_text',
  description: `Extract text content from PDF documents and other file formats. Supports OCR for scanned documents.
Returns the extracted text as a plain text file. Useful for indexing, search, or text analysis.`,
  instructions: [
    'For PDF input, set ocrEnabled true to force OCR, false to disable OCR, or omit it for the provider default.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceFormat: z
        .string()
        .default('pdf')
        .describe('Source file format (e.g., "pdf", "docx", "pptx")'),
      file: fileSourceSchema,
      ocrEnabled: z
        .boolean()
        .optional()
        .describe(
          'PDF input only: true forces OCR and false disables OCR. Omit for other formats.'
        )
    })
  )
  .output(
    z.object({
      conversionCost: z.number().describe('Number of conversion credits consumed'),
      conversionTime: z
        .number()
        .optional()
        .describe('Provider-reported legacy duration, when present'),
      fileName: z.string().describe('Name of the output text file'),
      fileSize: z.number().describe('Size of the extracted text in bytes'),
      textContent: z
        .string()
        .nullable()
        .describe(
          'Legacy field, always null. The extracted text is available as a downloadable file.'
        ),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the text file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);
    let parameters: Record<string, string> = {};
    if (ctx.input.ocrEnabled !== undefined && ctx.input.sourceFormat !== 'pdf')
      throw invalid(
        'ocrEnabled is supported by the PDF text converter. Omit it for other source formats, or convert the source to PDF first.'
      );

    if (ctx.input.ocrEnabled !== undefined) {
      parameters.OcrMode = ctx.input.ocrEnabled ? 'force' : 'never';
    }

    let rawResult = await client.convert({
      sourceFormat: ctx.input.sourceFormat,
      destinationFormat: 'txt',
      files: [fileSource],
      storeFile: true,
      parameters
    });
    let result = await deliverFiles(ctx, rawResult);

    let textFile = result.files[0]!;
    return {
      output: {
        conversionCost: result.conversionCost,
        conversionTime: result.conversionTime,
        fileName: textFile.fileName,
        fileSize: textFile.fileSize,
        textContent: null,
        fileId: textFile.fileId,
        url: textFile.url
      },
      message: `Extracted text from **${ctx.input.sourceFormat}** → \`${textFile.fileName}\` (${textFile.fileSize} bytes).`
    };
  })
  .build();
