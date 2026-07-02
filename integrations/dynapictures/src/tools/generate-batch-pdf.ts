import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let layerParamsSchema = z.object({
  name: z.string().describe('Name of the template layer to customize'),
  text: z.string().optional().describe('Text content for a text layer'),
  color: z.string().optional().describe('Text or foreground color (hex, rgb, or rgba)'),
  backgroundColor: z.string().optional().describe('Background color (hex, rgb, or rgba)'),
  imageUrl: z.string().optional().describe('URL of an image for an image layer'),
  imagePosition: z.string().optional().describe('Image cropping mode'),
  opacity: z.number().optional().describe('Layer opacity (0.0–1.0)')
});

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
      imageId: z.string().describe('ID of the generated PDF'),
      templateId: z.string().describe('Default template ID'),
      imageUrl: z.string().describe('URL of the generated PDF'),
      thumbnailUrl: z.string().describe('URL of the PDF thumbnail'),
      pdfUrl: z.string().optional().describe('Direct PDF URL'),
      metadata: z.string().describe('Custom metadata'),
      width: z.number().describe('Page width in pixels'),
      height: z.number().describe('Page height in pixels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateBatchPdf({
      templateId: ctx.input.templateId,
      format: 'pdf',
      metadata: ctx.input.metadata,
      pages: ctx.input.pages
    });

    return {
      output: {
        imageId: result.id,
        templateId: result.templateId,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        pdfUrl: result.pdfUrl,
        metadata: result.metadata || '',
        width: result.width,
        height: result.height
      },
      message: `Generated batch PDF with **${ctx.input.pages.length}** page(s). [View PDF](${result.pdfUrl || result.imageUrl})`
    };
  })
  .build();
