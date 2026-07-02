import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateBarcode = SlateTool.create(spec, {
  name: 'Generate Barcode',
  key: 'generate_barcode',
  description: `Generate a barcode image URL for a given value. Supports QR codes and PDF417 barcodes with configurable size, format, and error correction level. Returns a URL that renders the barcode image.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      value: z.string().describe('Barcode value to encode (max 100 characters)'),
      barcodeType: z
        .enum(['qr', 'pdf417'])
        .optional()
        .describe('Barcode format. Defaults to "qr".'),
      size: z.string().optional().describe('Barcode size from 1-10 (50px increments)'),
      fileType: z
        .enum(['jpg', 'png', 'gif'])
        .optional()
        .describe('Image format. Defaults to "gif".'),
      hideValue: z.boolean().optional().describe('Hide the barcode value text from the image'),
      text: z.string().optional().describe('Custom text to display below the barcode'),
      textSize: z.string().optional().describe('Text size in pixels (8-16 recommended)'),
      textAlignment: z
        .enum(['L', 'C', 'R'])
        .optional()
        .describe('Text alignment: L=left, C=center, R=right'),
      errorCorrection: z
        .enum(['L', 'M', 'Q', 'H'])
        .optional()
        .describe('Error correction level. L=lowest, H=highest. Defaults to "L".')
    })
  )
  .output(
    z.object({
      barcodeUrl: z.string().describe('URL to the generated barcode image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let barcodeUrl = await client.generateBarcode({
      value: ctx.input.value,
      barcodeType: ctx.input.barcodeType,
      size: ctx.input.size,
      fileType: ctx.input.fileType,
      hideValue: ctx.input.hideValue,
      text: ctx.input.text,
      textSize: ctx.input.textSize,
      textAlignment: ctx.input.textAlignment,
      errorCorrection: ctx.input.errorCorrection
    });

    return {
      output: { barcodeUrl },
      message: `Generated **${ctx.input.barcodeType || 'qr'}** barcode for value **${ctx.input.value}**.`
    };
  })
  .build();
