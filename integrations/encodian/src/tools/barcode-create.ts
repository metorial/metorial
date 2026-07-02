import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let barcodeCreate = SlateTool.create(spec, {
  name: 'Create Barcode or QR Code',
  key: 'barcode_create',
  description: `Generate barcodes or QR codes as image files. Supports 30+ barcode types (Code128, EAN13, QR, Aztec, etc.) and QR codes with customizable size, colors, rotation, and image format.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z.enum(['barcode', 'qr_code']).describe('Whether to create a barcode or QR code'),
      barcodeData: z.string().describe('Data to encode in the barcode/QR code'),
      barcodeType: z
        .string()
        .optional()
        .describe('Barcode type (e.g., Code128, EAN13, Aztec, QR) - for barcode type only'),
      imageFormat: z
        .enum(['PNG', 'JPG', 'SVG', 'BMP', 'TIFF', 'GIF'])
        .optional()
        .describe('Output image format'),
      width: z.number().optional().describe('Width in pixels'),
      height: z.number().optional().describe('Height in pixels'),
      foreColor: z
        .string()
        .optional()
        .describe('Foreground/bar color (HTML format, e.g., #000000)'),
      backColor: z
        .string()
        .optional()
        .describe('Background color (HTML format, e.g., #FFFFFF)'),
      captionAbove: z.string().optional().describe('Caption text above the barcode'),
      captionBelow: z.string().optional().describe('Caption text below the barcode'),
      resolution: z.number().optional().describe('Resolution in DPI'),
      rotationAngle: z.number().optional().describe('Rotation angle in degrees')
    })
  )
  .output(
    z.object({
      fileName: z.string().describe('Output filename'),
      fileContent: z.string().describe('Base64-encoded barcode/QR code image'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: any;

    if (ctx.input.type === 'barcode') {
      let barcodeType = ctx.input.barcodeType || 'Code128';
      let body: Record<string, any> = {
        barcodeType: barcodeType,
        barcodeData: ctx.input.barcodeData,
        barcodeImageFormat: ctx.input.imageFormat || 'PNG'
      };
      if (ctx.input.width) body.width = ctx.input.width;
      if (ctx.input.height) body.height = ctx.input.height;
      if (ctx.input.foreColor) body.barColor = ctx.input.foreColor;
      if (ctx.input.backColor) body.backColor = ctx.input.backColor;
      if (ctx.input.captionAbove) body.captionAbove = ctx.input.captionAbove;
      if (ctx.input.captionBelow) body.captionBelow = ctx.input.captionBelow;
      if (ctx.input.resolution) body.resolution = ctx.input.resolution;
      if (ctx.input.rotationAngle) body.rotationangle = ctx.input.rotationAngle;

      result = await client.createBarcode(body, barcodeType);
    } else {
      let body: Record<string, any> = {
        barcodeData: ctx.input.barcodeData,
        barcodeImageFormat: ctx.input.imageFormat || 'PNG'
      };
      if (ctx.input.width) body.width = ctx.input.width;
      if (ctx.input.height) body.height = ctx.input.height;
      if (ctx.input.foreColor) body.foreColor = ctx.input.foreColor;
      if (ctx.input.backColor) body.backColor = ctx.input.backColor;
      if (ctx.input.captionAbove) body.captionAboveText = ctx.input.captionAbove;
      if (ctx.input.captionBelow) body.captionBelowText = ctx.input.captionBelow;

      result = await client.createQrCode(body);
    }

    return {
      output: {
        fileName: result.Filename || '',
        fileContent: result.FileContent || '',
        operationId: result.OperationId || ''
      },
      message: `Successfully created **${ctx.input.type === 'barcode' ? ctx.input.barcodeType || 'Code128' : 'QR code'}** image.`
    };
  })
  .build();
