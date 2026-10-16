import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getFileAuthHeaders, validateLayers } from '../lib/client';
import { generatedPageSchema, layerParamsSchema } from '../lib/schemas';
import { spec } from '../spec';

let pageParamsSchema = z.object({
  index: z.number().optional().describe('Page index (0-based)'),
  templateId: z
    .string()
    .optional()
    .describe('Override template ID for this specific page (batch mode)'),
  metadata: z.string().optional().describe('Custom metadata for this page'),
  layers: z.array(layerParamsSchema).describe('Layer customizations for this page')
});

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate a customized image or PDF from a DynaPictures template. Supports single-page and multi-page generation with per-layer customization of text, images, colors, borders, opacity, charts, and effects. Set format to "pdf" for PDF output.`,
  instructions: [
    'Use "params" for single-page image generation and "pages" for multi-page generation. Do not use both.',
    'Layer names must match the names defined in the template. Use the "Get Template" tool to discover available layers.'
  ],
  constraints: [
    'Supported output formats: png, jpeg, webp, avif, pdf.',
    'The template must already exist in your DynaPictures account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID (UID) of the template to generate from'),
      format: z
        .enum(['png', 'jpeg', 'webp', 'avif', 'pdf'])
        .optional()
        .describe('Output format. Defaults to template settings.'),
      metadata: z
        .string()
        .optional()
        .describe('Custom metadata string to attach to the generated image'),
      params: z
        .array(layerParamsSchema)
        .optional()
        .describe('Layer customizations for single-page generation'),
      pages: z
        .array(pageParamsSchema)
        .optional()
        .describe('Page definitions for multi-page generation')
    })
  )
  .output(
    z.object({
      imageId: z.string().optional().describe('ID of the generated image'),
      templateId: z.string().describe('Template ID used for generation'),
      imageUrl: z.string().optional().describe('URL of the generated image or PDF'),
      thumbnailUrl: z.string().optional().describe('URL of the thumbnail'),
      retinaThumbnailUrl: z
        .string()
        .optional()
        .describe('URL of the retina-quality thumbnail'),
      pdfUrl: z.string().optional().describe('URL of the generated PDF (when format is pdf)'),
      metadata: z.string().optional().describe('Custom metadata attached to the image'),
      width: z.number().optional().describe('Image width in pixels'),
      height: z.number().optional().describe('Image height in pixels'),
      templateName: z
        .string()
        .optional()
        .describe('Template name returned for multipage generation'),
      pages: z
        .array(generatedPageSchema)
        .optional()
        .describe('Generated images for a multipage template'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete generation response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.params !== undefined && ctx.input.pages !== undefined) {
      throw createApiServiceError(
        'Use params for a single-page request or pages for a multipage request, not both.'
      );
    }
    validateLayers(ctx.input.params ?? []);
    for (let page of ctx.input.pages ?? []) {
      if (page.index !== undefined && (!Number.isInteger(page.index) || page.index < 0)) {
        throw createApiServiceError('Page index must be a whole number starting at 0.');
      }
      validateLayers(page.layers);
    }
    let { templateId, ...request } = ctx.input;
    let result = await client.generateImage(templateId, request);
    let urls = new Set<string>();
    let mainUrl = result.pdfUrl ?? result.imageUrl;
    if (mainUrl) urls.add(mainUrl);
    for (let page of result.pages ?? []) urls.add(page.imageUrl);
    for (let url of urls) {
      await ctx.addAttachment({
        type: 'url',
        url,
        headers: getFileAuthHeaders(url, ctx.auth.token)
      });
    }

    return {
      output: {
        imageId: result.id,
        templateId: result.templateId,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        retinaThumbnailUrl: result.retinaThumbnailUrl,
        pdfUrl: result.pdfUrl,
        metadata: result.metadata,
        width: result.width,
        height: result.height,
        templateName: result.templateName,
        pages: result.pages,
        raw: result
      },
      message: result.pages
        ? `Generated **${result.pages.length}** image page(s).`
        : `Generated ${ctx.input.format === 'pdf' ? 'PDF' : 'image'}${result.imageUrl ? `. [View file](${result.imageUrl})` : '.'}`
    };
  })
  .build();
