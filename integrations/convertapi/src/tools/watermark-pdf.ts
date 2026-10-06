import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deliverFiles } from '../lib/files';
import {
  buildFileSource,
  fileSourceSchema,
  invalid,
  stringInteger,
  text
} from '../lib/validation';
import { spec } from '../spec';

export let watermarkPdf = SlateTool.create(spec, {
  name: 'Watermark PDF',
  key: 'watermark_pdf',
  description: `Add a text watermark to a PDF document.
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
      conversionTime: z
        .number()
        .optional()
        .describe('Provider-reported legacy duration, when present'),
      fileName: z.string().describe('Name of the watermarked PDF'),
      fileSize: z.number().describe('Size of the watermarked PDF in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the watermarked PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);
    if (ctx.input.watermarkText === undefined)
      throw invalid('Provide watermarkText for the text watermark operation.');
    text(ctx.input.watermarkText, 'Watermark text');
    if (ctx.input.watermarkFontSize !== undefined)
      stringInteger(ctx.input.watermarkFontSize, 'watermarkFontSize', 1, 200);
    if (ctx.input.watermarkOpacity !== undefined)
      stringInteger(ctx.input.watermarkOpacity, 'watermarkOpacity', 0, 100);
    if (ctx.input.watermarkRotation !== undefined)
      stringInteger(ctx.input.watermarkRotation, 'watermarkRotation', 0, 360);
    let parameters: Record<string, string> = {};

    if (ctx.input.watermarkText) {
      parameters.Text = ctx.input.watermarkText;
    }
    if (ctx.input.watermarkFontSize) {
      parameters.FontSize = ctx.input.watermarkFontSize;
    }
    if (ctx.input.watermarkFontColor) {
      parameters.FontColor = ctx.input.watermarkFontColor;
    }
    if (ctx.input.watermarkOpacity) {
      parameters.Opacity = ctx.input.watermarkOpacity;
    }
    if (ctx.input.watermarkRotation) {
      parameters.Rotate = ctx.input.watermarkRotation;
    }

    let rawResult = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'text-watermark',
      files: [fileSource],
      storeFile: ctx.input.storeFile,
      parameters
    });
    let result = await deliverFiles(ctx, rawResult);

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
      message: `Watermarked PDF as \`${watermarked.fileName}\`.`
    };
  })
  .build();
