import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';
import {
  api2PdfFileOutputSchema,
  fetchApi2PdfAttachment,
  fileAttachment,
  fileOutput
} from './shared';

export let watermarkPdf = SlateTool.create(spec, {
  name: 'Watermark PDF',
  key: 'watermark_pdf',
  description: `Add a text watermark to an existing PDF document. Configure the watermark text, font size, color, opacity, and rotation angle. Useful for marking documents as drafts, confidential, or with custom branding.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Publicly accessible URL of the PDF to watermark'),
      text: z.string().optional().describe('Watermark text, defaults to "DRAFT"'),
      fontSize: z.number().optional().describe('Font size for the watermark, defaults to 72'),
      color: z
        .string()
        .optional()
        .describe('Hex color code for the watermark, defaults to "#000000"'),
      opacity: z
        .number()
        .optional()
        .describe('Opacity of the watermark from 0.0 to 1.0, defaults to 0.15'),
      rotation: z.number().optional().describe('Rotation angle in degrees, defaults to -45'),
      fileName: z.string().optional().describe('Desired file name for the watermarked PDF'),
      inline: z
        .boolean()
        .optional()
        .describe('If true, the PDF opens in browser; if false, triggers download'),
      extraHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Extra HTTP headers when fetching the source PDF')
    })
  )
  .output(api2PdfFileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    let result = await client.pdfSharpWatermark({
      url: ctx.input.url,
      text: ctx.input.text,
      fontSize: ctx.input.fontSize,
      color: ctx.input.color,
      opacity: ctx.input.opacity,
      rotation: ctx.input.rotation,
      fileName: ctx.input.fileName,
      inline: ctx.input.inline,
      extraHTTPHeaders: ctx.input.extraHttpHeaders
    });

    let file = await fetchApi2PdfAttachment(client, result, 'PDF watermarking failed');

    let watermarkText = ctx.input.text || 'DRAFT';

    return {
      output: fileOutput(result, file),
      attachments: [fileAttachment(file)],
      message: `Added "${watermarkText}" watermark to PDF (${result.mbOut} MB, ${result.seconds}s) and returned it as a Slate attachment.`
    };
  })
  .build();
