import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addWatermark = SlateTool.create(spec, {
  name: 'Add Watermark',
  key: 'add_watermark',
  description: `Add a text watermark to an existing PDF document. Configure font size, opacity, rotation angle, color, and font family for the watermark overlay.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      pdfUrl: z.string().describe('URL of the PDF to add a watermark to.'),
      text: z.string().describe('Watermark text to overlay on the PDF.'),
      fontSize: z
        .number()
        .optional()
        .describe('Font size for the watermark text. Default is 40.'),
      opacity: z
        .number()
        .optional()
        .describe('Opacity of the watermark (0.0 to 1.0). Default is 0.5.'),
      rotation: z.number().optional().describe('Rotation angle in degrees. Default is 45.'),
      hexColor: z
        .string()
        .optional()
        .describe('Watermark color in hex format (e.g., "#c7c7c7"). Default is "#c7c7c7".'),
      fontFamily: z
        .string()
        .optional()
        .describe(
          'Font family for the watermark. Default is "Helvetica". Options include Helvetica, Courier, Times-Roman, Symbol, ZapfDingbats.'
        ),
      expiration: z
        .number()
        .optional()
        .describe('Expiration time in minutes for the watermarked PDF URL (1-10080).')
    })
  )
  .output(
    z.object({
      fileUrl: z.string().describe('URL to download the watermarked PDF.'),
      transactionRef: z.string().describe('Unique transaction reference.'),
      status: z.string().describe('Status of the watermark request.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Adding watermark to PDF...');

    let result = await client.addWatermark({
      url: ctx.input.pdfUrl,
      text: ctx.input.text,
      fontSize: ctx.input.fontSize,
      opacity: ctx.input.opacity,
      rotation: ctx.input.rotation,
      hexColor: ctx.input.hexColor,
      fontFamily: ctx.input.fontFamily,
      expiration: ctx.input.expiration
    });

    return {
      output: {
        fileUrl: result.file,
        transactionRef: result.transaction_ref,
        status: result.status
      },
      message: `Watermark "${ctx.input.text}" added to PDF. [Download Watermarked PDF](${result.file})`
    };
  })
  .build();
