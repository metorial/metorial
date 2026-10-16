import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateLayers } from '../lib/client';
import { layerParamsSchema } from '../lib/schemas';
import { spec } from '../spec';

let batchPageSchema = z.object({
  templateId: z
    .string()
    .optional()
    .describe('Override template ID for this page (allows mixing different templates)'),
  metadata: z.string().optional().describe('Custom metadata for this page'),
  layers: z.array(layerParamsSchema).describe('Layer customizations for this page')
});

export let generateBatchPdf = SlateTool.create(spec, {
  name: 'Generate Batch PDF',
  key: 'generate_batch_pdf',
  description: `Generate a multi-page PDF where each page can use a different DynaPictures template. This enables flexible multi-template document assembly, such as combining a cover page, content pages, and a back page from separate templates into one PDF.`,
  instructions: [
    'Each page can optionally override the default template by specifying its own templateId.',
    'If a page does not specify a templateId, the top-level templateId is used.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .describe('Default template ID used for pages that do not specify their own'),
      metadata: z.string().optional().describe('Custom metadata for the generated PDF'),
      pages: z
        .array(batchPageSchema)
        .min(1)
        .describe('Array of page definitions (at least one page required)')
    })
  )
  .output(
    z.object({
      imageId: z.string().optional().describe('ID of the generated PDF'),
      templateId: z.string().optional().describe('Default template ID'),
      imageUrl: z.string().optional().describe('URL of the generated PDF'),
      thumbnailUrl: z.string().optional().describe('URL of the PDF thumbnail'),
      pdfUrl: z.string().optional().describe('Direct PDF URL'),
      metadata: z.string().optional().describe('Custom metadata'),
      width: z.number().optional().describe('Page width in pixels'),
      height: z.number().optional().describe('Page height in pixels'),
      mimeType: z.string().optional().describe('Content type of the generated document'),
      size: z.number().optional().describe('Generated document size in bytes'),
      requestContext: z
        .object({
          templateId: z.string().describe('Default template ID submitted for generation'),
          metadata: z.string().optional().describe('Metadata submitted for the PDF pages')
        })
        .optional()
        .describe('Submitted generation options; not provider response metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    for (let page of ctx.input.pages) validateLayers(page.layers);
    let content = await client.generateBatchPdf({
      templateId: ctx.input.templateId,
      format: 'pdf',
      metadata: ctx.input.metadata,
      pages: ctx.input.pages
    });

    await ctx.addAttachment({
      type: 'content',
      content: new Response(Buffer.from(content), {
        headers: { 'content-type': 'application/pdf' }
      }),
      filename: 'generated-document.pdf'
    });
    return {
      output: {
        mimeType: 'application/pdf',
        size: content.byteLength,
        requestContext: { templateId: ctx.input.templateId, metadata: ctx.input.metadata }
      },
      message: `Generated a downloadable PDF with **${ctx.input.pages.length}** page(s).`
    };
  })
  .build();
