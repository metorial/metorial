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

export let watermarkPdf = SlateTool.create(spec, {
  name: 'Watermark PDF',
  key: 'watermark_pdf',
  description: `Add a text or image watermark to a PDF document.
Customize the watermark text, font size, color, opacity, and rotation angle.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      file: fileSourceSchema,
      watermarkText: z
        .string()
        .optional()
        .describe('Text to use as watermark (e.g., "CONFIDENTIAL", "DRAFT")'),
      watermarkFontSize: z
        .string()
        .optional()
        .describe('Font size for the watermark text (e.g., "48")'),
      watermarkFontColor: z
        .string()
        .optional()
        .describe('Font color in hex (e.g., "#FF0000" for red)'),
      watermarkOpacity: z
        .string()
        .optional()
        .describe('Watermark opacity from 0 to 100 (e.g., "30")'),
      watermarkRotation: z
        .string()
        .optional()
        .describe('Rotation angle in degrees (e.g., "45")'),
      storeFile: z
        .boolean()
        .optional()
        .default(true)
        .describe('Store watermarked file on ConvertAPI server for download')
    })
  )
  .output(
    z.object({
      conversionCost: z.number().describe('Number of conversion credits consumed'),
      conversionTime: z.number().describe('Duration in seconds'),
      fileName: z.string().describe('Name of the watermarked PDF'),
      fileSize: z.number().describe('Size of the watermarked PDF in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the watermarked PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);
    let parameters: Record<string, string> = {};

    if (ctx.input.watermarkText) {
      parameters.WatermarkText = ctx.input.watermarkText;
    }
    if (ctx.input.watermarkFontSize) {
      parameters.WatermarkFontSize = ctx.input.watermarkFontSize;
    }
    if (ctx.input.watermarkFontColor) {
      parameters.WatermarkFontColor = ctx.input.watermarkFontColor;
    }
    if (ctx.input.watermarkOpacity) {
      parameters.WatermarkTransparency = ctx.input.watermarkOpacity;
    }
    if (ctx.input.watermarkRotation) {
      parameters.WatermarkRotation = ctx.input.watermarkRotation;
    }

    let result = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'watermark',
      files: [fileSource],
      storeFile: ctx.input.storeFile,
      parameters
    });

    let watermarked = result.files[0]!;
    return {
      output: {
        conversionCost: result.conversionCost,
        conversionTime: result.conversionTime,
        fileName: watermarked.fileName,
        fileSize: watermarked.fileSize,
        fileId: watermarked.fileId,
        url: watermarked.url
      },
      message: `Watermarked PDF as \`${watermarked.fileName}\` in ${result.conversionTime}s.`
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
