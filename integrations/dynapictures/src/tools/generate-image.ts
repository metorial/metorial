import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let layerParamsSchema = z.object({
  name: z.string().describe('Name of the template layer to customize'),
  text: z.string().optional().describe('Text content for a text layer'),
  color: z.string().optional().describe('Text or foreground color (hex, rgb, or rgba)'),
  backgroundColor: z.string().optional().describe('Background color (hex, rgb, or rgba)'),
  borderColor: z.string().optional().describe('Border color (hex, rgb, or rgba)'),
  borderWidth: z.string().optional().describe('Border width, e.g. "1px"'),
  borderRadius: z.string().optional().describe('Border radius, e.g. "5px"'),
  imageUrl: z.string().optional().describe('URL of an image to use for an image layer'),
  imagePosition: z
    .string()
    .optional()
    .describe(
      'Image cropping mode: "cro" (crop), "ai_face" (AI face detection), "cov" (cover), or "align" (alignment-based)'
    ),
  imageAlignH: z
    .string()
    .optional()
    .describe('Horizontal alignment: "left", "center", "right", or "full"'),
  imageAlignV: z
    .string()
    .optional()
    .describe('Vertical alignment: "top", "center", "bottom", or "full"'),
  imageEffect: z
    .string()
    .optional()
    .describe(
      'CSS filter value for image effects, e.g. "grayscale(100%)", "blur(5px)", "sepia(100%)"'
    ),
  opacity: z
    .number()
    .optional()
    .describe('Layer opacity from 0.0 (transparent) to 1.0 (opaque)'),
  chartColor: z.string().optional().describe('Chart bar/line color (hex, rgb, or rgba)'),
  chartLabelColor: z.string().optional().describe('Chart label color (hex, rgb, or rgba)'),
  chartDataLabels: z.array(z.string()).optional().describe('Array of chart data labels'),
  chartDataValues: z.array(z.number()).optional().describe('Array of chart data values')
});

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
      imageId: z.string().describe('ID of the generated image'),
      templateId: z.string().describe('Template ID used for generation'),
      imageUrl: z.string().describe('URL of the generated image or PDF'),
      thumbnailUrl: z.string().describe('URL of the thumbnail'),
      retinaThumbnailUrl: z
        .string()
        .optional()
        .describe('URL of the retina-quality thumbnail'),
      pdfUrl: z.string().optional().describe('URL of the generated PDF (when format is pdf)'),
      metadata: z.string().describe('Custom metadata attached to the image'),
      width: z.number().describe('Image width in pixels'),
      height: z.number().describe('Image height in pixels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let request: Record<string, unknown> = {};
    if (ctx.input.format) request.format = ctx.input.format;
    if (ctx.input.metadata) request.metadata = ctx.input.metadata;
    if (ctx.input.params) request.params = ctx.input.params;
    if (ctx.input.pages) request.pages = ctx.input.pages;

    let result = await client.generateImage(ctx.input.templateId, request);

    return {
      output: {
        imageId: result.id,
        templateId: result.templateId,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        retinaThumbnailUrl: result.retinaThumbnailUrl,
        pdfUrl: result.pdfUrl,
        metadata: result.metadata || '',
        width: result.width,
        height: result.height
      },
      message: `Generated image **${result.id}** (${result.width}x${result.height}). [View image](${result.imageUrl})`
    };
  })
  .build();
