import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { spec } from '../spec';

export let rasterizePdf = SlateTool.create(spec, {
  name: 'Rasterize PDF',
  key: 'rasterize_pdf',
  description: `Convert a PDF file into flat JPG and PNG images. Configurable DPI (up to 300) for print-quality output. Useful for creating image previews of PDF documents.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pdfUrl: z.string().describe('URL of the PDF file to rasterize'),
      dpi: z.number().optional().describe('Resolution in DPI (max 300, default varies)'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST when rasterization completes')
    })
  )
  .output(
    z.object({
      rasterizeUid: z.string().describe('UID of the rasterization operation'),
      status: z.string().describe('Processing status'),
      imageUrlPng: z.string().nullable().describe('URL of the rasterized PNG image'),
      imageUrlJpg: z.string().nullable().describe('URL of the rasterized JPG image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.rasterizePdf({
      url: ctx.input.pdfUrl,
      dpi: ctx.input.dpi,
      webhook_url: ctx.input.webhookUrl
    });

    return {
      output: {
        rasterizeUid: result.uid,
        status: result.status,
        imageUrlPng: result.image_url_png || null,
        imageUrlJpg: result.image_url_jpg || null
      },
      message: `PDF rasterization ${result.status === 'completed' ? 'completed' : 'initiated'} (UID: ${result.uid}). ${result.image_url_png ? `[View PNG](${result.image_url_png})` : 'Still processing.'}`
    };
  })
  .build();
