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
      conversionTime: z.number().describe('Split duration in seconds'),
      files: z.array(splitFileSchema).describe('Split PDF files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);
    let parameters: Record<string, string> = {};
    if (ctx.input.splitByPage) {
      parameters.SplitByPage = ctx.input.splitByPage;
    }

    let result = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'split',
      files: [fileSource],
      storeFile: ctx.input.storeFile,
      parameters
    });

    return {
      output: {
        conversionCost: result.conversionCost,
        conversionTime: result.conversionTime,
        files: result.files
      },
      message: `Split PDF into **${result.files.length} file(s)** in ${result.conversionTime}s (cost: ${result.conversionCost} credit${result.conversionCost !== 1 ? 's' : ''}).`
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
