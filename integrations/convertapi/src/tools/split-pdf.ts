import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deliverFiles } from '../lib/files';
import { buildFileSource, fileSourceSchema, invalid } from '../lib/validation';
import { spec } from '../spec';

let splitFileSchema = z.object({
  fileName: z.string().describe('Name of the split PDF'),
  fileExt: z.string().describe('File extension'),
  fileSize: z.number().describe('Size in bytes'),
  fileId: z.string().nullable().describe('ConvertAPI file ID'),
  url: z.string().nullable().describe('Download URL')
});

export let splitPdf = SlateTool.create(spec, {
  name: 'Split PDF',
  key: 'split_pdf',
  description: `Split a PDF document into multiple separate PDF files.
By default, splits into one PDF per page. Use the splitByPage parameter to control how pages are grouped.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      file: fileSourceSchema,
      splitByPage: z
        .string()
        .optional()
        .describe(
          'Pages per output file (e.g., "1" for one page per file, "2" for two pages per file)'
        ),
      storeFile: z
        .boolean()
        .optional()
        .default(true)
        .describe('Store split files on ConvertAPI server for download')
    })
  )
  .output(
    z.object({
      conversionCost: z.number().describe('Number of conversion credits consumed'),
      conversionTime: z
        .number()
        .optional()
        .describe('Provider-reported legacy duration, when present'),
      files: z.array(splitFileSchema).describe('Split PDF files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);
    let parameters: Record<string, string> = { Mode: 'pagecount', Value: '1' };
    if (ctx.input.splitByPage !== undefined) {
      if (
        !/^\d+(?:,\d+)*$/.test(ctx.input.splitByPage) ||
        ctx.input.splitByPage
          .split(',')
          .some(v => !Number.isSafeInteger(Number(v)) || Number(v) < 1)
      )
        throw invalid(
          'splitByPage must be a positive page count or a comma-separated sequence of positive counts.'
        );
      parameters.Value = ctx.input.splitByPage;
    }

    let rawResult = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'split',
      files: [fileSource],
      storeFile: ctx.input.storeFile,
      parameters
    });
    let result = await deliverFiles(ctx, rawResult);

    return {
      output: {
        conversionCost: result.conversionCost,
        conversionTime: result.conversionTime,
        files: result.files
      },
      message: `Split PDF into **${result.files.length} file(s)** (cost: ${result.conversionCost} credit${result.conversionCost !== 1 ? 's' : ''}).`
    };
  })
  .build();
