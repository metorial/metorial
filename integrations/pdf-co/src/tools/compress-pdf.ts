import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import {
  assertPdfCoSuccess,
  createPdfCoAttachment,
  downloadPdfCoOutput,
  fileAttachmentOutputFields,
  toFileOutput
} from './shared';

const compressionConfigSchema = z
  .record(z.string(), z.any())
  .optional()
  .describe(
    'Advanced PDF.co v2 compression config object. When provided, it is sent as config and overrides the convenience compression fields.'
  );

const garbageCollectionLevel = z
  .enum(['none', 'remove_unused', 'compact_xref', 'merge_duplicate_objects', 'dedupe_streams'])
  .optional()
  .describe('PDF save cleanup level. Defaults to PDF.co standard dedupe_streams behavior.');

let garbageValue = (level: z.infer<typeof garbageCollectionLevel>) => {
  switch (level) {
    case 'none':
      return 0;
    case 'remove_unused':
      return 1;
    case 'compact_xref':
      return 2;
    case 'merge_duplicate_objects':
      return 3;
    default:
      return 4;
  }
};

let buildCompressionConfig = (input: {
  jpegQuality?: number;
  downsamplePpi?: number;
  thresholdPpi?: number;
  garbageCollection?: z.infer<typeof garbageCollectionLevel>;
}) => {
  let hasImageOptions =
    input.jpegQuality !== undefined ||
    input.downsamplePpi !== undefined ||
    input.thresholdPpi !== undefined;

  if (!hasImageOptions && input.garbageCollection === undefined) {
    return undefined;
  }

  let imageConfig = {
    skip: false,
    downsample: {
      skip: false,
      downsample_ppi: input.downsamplePpi ?? 150,
      threshold_ppi: input.thresholdPpi ?? 225
    },
    compression: {
      skip: false,
      compression_format: 'jpeg',
      compression_params: {
        quality: input.jpegQuality ?? 60
      }
    }
  };

  return {
    images: {
      color: imageConfig,
      grayscale: imageConfig,
      monochrome: {
        skip: false,
        downsample: {
          skip: false,
          downsample_ppi: input.downsamplePpi ?? 300,
          threshold_ppi: input.thresholdPpi ?? 450
        },
        compression: {
          skip: false,
          compression_format: 'ccitt_g4',
          compression_params: {}
        }
      }
    },
    save: {
      garbage: garbageValue(input.garbageCollection)
    }
  };
};

export let compressPdf = SlateTool.create(spec, {
  name: 'Compress PDF',
  key: 'compress_pdf',
  description: `Compress a PDF using PDF.co's current v2 compression API. Use this to reduce PDF file size while keeping the processed PDF available as a Slate attachment.`,
  instructions: [
    'Provide a public PDF URL or PDF.co temporary file URL.',
    'Leave compression options empty to use PDF.co defaults, or set jpegQuality/downsamplePpi/thresholdPpi for common image-heavy PDFs.',
    'Use rawConfig only when you need the full PDF.co v2 compression configuration object.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the source PDF file to compress'),
      pages: z.string().optional().describe('Page indices to process, e.g. "0,1,2" or "0-5"'),
      password: z.string().optional().describe('Password for protected PDF files'),
      outputFileName: z.string().optional().describe('Name for the compressed PDF file'),
      expirationMinutes: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Expiration time for the PDF.co temporary output URL, in minutes'),
      jpegQuality: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('JPEG quality for color and grayscale image compression, 1-100'),
      downsamplePpi: z
        .number()
        .positive()
        .optional()
        .describe('Target PPI for downsampling images'),
      thresholdPpi: z
        .number()
        .positive()
        .optional()
        .describe('Only downsample images at or above this PPI'),
      garbageCollection: garbageCollectionLevel,
      rawConfig: compressionConfigSchema
    })
  )
  .output(
    z.object({
      ...fileAttachmentOutputFields,
      pageCount: z.number().describe('Number of pages in the compressed PDF'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.compressPdf({
      url: ctx.input.sourceUrl,
      pages: ctx.input.pages,
      password: ctx.input.password,
      name: ctx.input.outputFileName,
      expiration: ctx.input.expirationMinutes,
      config:
        ctx.input.rawConfig ??
        buildCompressionConfig({
          jpegQuality: ctx.input.jpegQuality,
          downsamplePpi: ctx.input.downsamplePpi,
          thresholdPpi: ctx.input.thresholdPpi,
          garbageCollection: ctx.input.garbageCollection
        })
    });

    result = assertPdfCoSuccess(result, 'PDF compression failed');
    let file = await downloadPdfCoOutput(client, result, 'application/pdf');

    return {
      output: toFileOutput(result, file),
      attachments: [createPdfCoAttachment(file)],
      message: `Compressed PDF — ${result.pageCount} page(s), returned as an attachment.`
    };
  })
  .build();
