import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { nativeState, nullableText, stateMessage, uid } from '../lib/contracts';
import { deliverGeneratedFiles } from '../lib/results';
import { projectIdSchema } from '../lib/schemas';
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
      projectId: projectIdSchema,
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
    const client = new BannerbearClient({ ...ctx.auth, projectId: ctx.input.projectId });
    const result = await client.rasterizePdf({
      url: ctx.input.pdfUrl,
      dpi: ctx.input.dpi,
      webhook_url: ctx.input.webhookUrl
    });
    const output = {
      rasterizeUid: uid(result.uid),
      status: nativeState(result.status),
      imageUrlPng: nullableText(result.image_url_png),
      imageUrlJpg: nullableText(result.image_url_jpg)
    };
    await deliverGeneratedFiles(ctx, 'rasterized_pdf', result);
    return {
      output,
      message: `PDF rasterization ${stateMessage(result.status)} (UID: ${output.rasterizeUid}). Read its status with get_resource.`
    };
  })
  .build();
