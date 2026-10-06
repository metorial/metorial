import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deliverFiles } from '../lib/files';
import { buildFileSource, fileSourceSchema } from '../lib/validation';
import { spec } from '../spec';

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
      conversionTime: z
        .number()
        .optional()
        .describe('Provider-reported legacy duration, when present'),
      fileName: z.string().describe('Name of the compressed PDF'),
      fileSize: z.number().describe('Size of the compressed PDF in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the compressed PDF')
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
      destinationFormat: 'compress',
      files: [fileSource],
      storeFile: ctx.input.storeFile
    });
    let result = await deliverFiles(ctx, rawResult);

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
      message: `Compressed PDF to \`${compressed.fileName}\` (${compressed.fileSize} bytes).`
    };
  })
  .build();
