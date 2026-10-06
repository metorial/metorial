import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deliverFiles } from '../lib/files';
import { buildFileSource, fileSourceSchema } from '../lib/validation';
import { spec } from '../spec';

export let pdfToPdfa = SlateTool.create(spec, {
  name: 'Convert to PDF/A',
  key: 'pdf_to_pdfa',
  description: `Convert a PDF document to PDF/A format using the provider default PDF/A-2b setting for archiving.
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
      conversionTime: z
        .number()
        .optional()
        .describe('Provider-reported legacy duration, when present'),
      fileName: z.string().describe('Name of the PDF/A file'),
      fileSize: z.number().describe('Size of the PDF/A file in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the PDF/A file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);

    let rawResult = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'pdfa',
      files: [fileSource],
      storeFile: ctx.input.storeFile
    });
    let result = await deliverFiles(ctx, rawResult);

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
      message: `Converted to PDF/A: \`${pdfa.fileName}\` (${pdfa.fileSize} bytes).`
    };
  })
  .build();
