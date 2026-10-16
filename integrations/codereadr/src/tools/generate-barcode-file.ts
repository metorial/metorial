import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateBarcodeFile = SlateTool.create(spec, {
  name: 'Generate Barcode File',
  key: 'generate_barcode_file',
  description:
    'Generate a downloadable QR or PDF417 barcode image. Branded image options may require a paid plan.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      value: z.string().describe('Barcode value to encode, up to 500 characters.'),
      barcodeType: z
        .enum(['qr', 'pdf417'])
        .optional()
        .describe('Barcode format. Provider default: qr.'),
      size: z.string().optional().describe('Size from 1 through 10, in 50-pixel increments.'),
      fileType: z
        .enum(['jpg', 'png', 'gif'])
        .optional()
        .describe('Image format. Provider default: png.'),
      hideValue: z.boolean().optional().describe('Hide the barcode value text.'),
      text: z.string().optional().describe('Custom text below the barcode.'),
      textSize: z.string().optional().describe('Custom text size from 1 through 30 pixels.'),
      textAlignment: z.enum(['L', 'C', 'R']).optional().describe('Custom text alignment.'),
      errorCorrection: z
        .enum(['L', 'M', 'Q', 'H'])
        .optional()
        .describe('Error correction level. Provider default: L.')
    })
  )
  .output(z.object({ filename: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).generateBarcodeFile(ctx.input);
    await ctx.addAttachment({
      type: 'content',
      content: result.content,
      filename: result.filename,
      mimeType: result.mimeType
    });
    return {
      output: { filename: result.filename, mimeType: result.mimeType },
      message: 'Generated a downloadable barcode image.'
    };
  })
  .build();
