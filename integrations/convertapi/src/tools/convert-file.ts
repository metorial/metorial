import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deliverFiles } from '../lib/files';
import { buildFileSource, fileSourceSchema } from '../lib/validation';
import { spec } from '../spec';

let convertedFileSchema = z.object({
  fileName: z.string().describe('Name of the converted file'),
  fileExt: z.string().describe('Extension of the converted file'),
  fileSize: z.number().describe('Size of the converted file in bytes'),
  fileId: z
    .string()
    .nullable()
    .describe('ConvertAPI file ID (available when storeFile is true)'),
  url: z.string().nullable().describe('Download URL (available when storeFile is true)')
});

export let convertFile = SlateTool.create(spec, {
  name: 'Convert File',
  key: 'convert_file',
  description: `Convert a file between supported formats including PDF, DOCX, XLSX, PPTX, HTML, JPG, PNG, and more.
Provide the source file via URL, file ID, or base64-encoded content. Optionally store the result on ConvertAPI's server for chaining or later download.
Supports format-specific parameters like page size, orientation, quality, and image dimensions.`,
  instructions: [
    'Use lowercase format strings (e.g., "pdf", "docx", "jpg").',
    'Set storeFile to true if you need to use the converted file in subsequent operations or want a download URL.',
    'Use the conversionParameters field to pass format-specific options like PageSize, Quality, ImageWidth, etc.'
  ],
  constraints: [
    'Stored files are automatically deleted after 3 hours.',
    'Each conversion consumes credits from your ConvertAPI account balance.'
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
        .describe('Source file format extension (e.g., "docx", "html", "png")'),
      destinationFormat: z
        .string()
        .describe('Target file format extension (e.g., "pdf", "jpg", "xlsx")'),
      file: fileSourceSchema,
      storeFile: z
        .boolean()
        .optional()
        .default(false)
        .describe('Store converted file on ConvertAPI server for chaining or download'),
      conversionParameters: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Format-specific conversion parameters (e.g., {"PageSize": "A4", "Quality": "80"})'
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
      files: z.array(convertedFileSchema).describe('Converted output files')
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
      sourceFormat: ctx.input.sourceFormat,
      destinationFormat: ctx.input.destinationFormat,
      files: [fileSource],
      storeFile: ctx.input.storeFile,
      parameters: ctx.input.conversionParameters
    });
    let result = await deliverFiles(ctx, rawResult);

    let fileNames = result.files.map(f => f.fileName).join(', ');
    return {
      output: result,
      message: `Converted **${ctx.input.sourceFormat}** → **${ctx.input.destinationFormat}**. Output: ${fileNames} (cost: ${result.conversionCost} credit${result.conversionCost !== 1 ? 's' : ''}).`
    };
  })
  .build();
