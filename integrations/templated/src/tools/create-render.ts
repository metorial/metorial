import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let layerModificationSchema = z
  .record(z.string(), z.any())
  .describe(
    'Layer modifications keyed by layer name. Each layer can have properties like text, color, image_url, font_family, font_size, opacity, x, y, width, height, rotation, hide, etc.'
  );

let pageSchema = z.object({
  page: z.string().describe('Page identifier'),
  layers: layerModificationSchema.optional().describe('Layer modifications for this page'),
  width: z.number().optional().describe('Page-specific width override in pixels'),
  height: z.number().optional().describe('Page-specific height override in pixels')
});

export let createRender = SlateTool.create(spec, {
  name: 'Create Render',
  key: 'create_render',
  description: `Generate an image, video, or PDF from a template by specifying layer modifications such as text, colors, images, and positioning.
Supports single and multi-page templates, batch rendering from multiple templates, and video output with animations.
Use **layers** for single-page modifications or **pages** for per-page modifications in multi-page templates.`,
  instructions: [
    'Use the template ID from your Templated dashboard or from listing templates.',
    'Layer names must match the names defined in the template editor.',
    'For multi-page templates, use the pages parameter instead of layers to customize each page independently.',
    'For video renders (mp4), set the format to "mp4" and optionally specify duration and fps.'
  ],
  constraints: [
    'Width and height must be between 100 and 5000 pixels.',
    'Scale must be between 0.1 and 2.0.',
    'Video duration max is 90000ms. Video FPS range is 1-60.'
  ]
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID to render'),
      templateIds: z
        .array(z.string())
        .optional()
        .describe(
          'List of template IDs for batch rendering. Overrides templateId if provided.'
        ),
      format: z
        .enum(['jpg', 'png', 'webp', 'pdf', 'mp4'])
        .optional()
        .describe('Output format. Default: jpg'),
      renderName: z.string().optional().describe('Custom name for the render'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier to link with your own system'),
      transparent: z.boolean().optional().describe('Make background transparent (PNG only)'),
      background: z.string().optional().describe('Background color in hex format'),
      width: z.number().optional().describe('Custom width in pixels (100-5000)'),
      height: z.number().optional().describe('Custom height in pixels (100-5000)'),
      scale: z.number().optional().describe('Scale factor (0.1-2.0). Default: 1.0'),
      flatten: z.boolean().optional().describe('Flatten PDF layers'),
      cmyk: z.boolean().optional().describe('CMYK color mode for PDF'),
      duration: z
        .number()
        .optional()
        .describe('Video duration in milliseconds (max 90000). Default: 5000'),
      fps: z.number().optional().describe('Frames per second for video (1-60). Default: 30'),
      layers: layerModificationSchema.optional(),
      pages: z
        .array(pageSchema)
        .optional()
        .describe('Per-page layer modifications for multi-page templates'),
      merge: z.boolean().optional().describe('Merge multi-page renders into a single PDF')
    })
  )
  .output(
    z
      .any()
      .describe(
        'Render result - single render object or array for multi-page/batch renders. Each render includes renderId, url, width, height, format, templateId, templateName, and createdAt.'
      )
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.createRender({
      template: ctx.input.templateId,
      templates: ctx.input.templateIds,
      format: ctx.input.format,
      name: ctx.input.renderName,
      externalId: ctx.input.externalId,
      transparent: ctx.input.transparent,
      background: ctx.input.background,
      width: ctx.input.width,
      height: ctx.input.height,
      scale: ctx.input.scale,
      flatten: ctx.input.flatten,
      cmyk: ctx.input.cmyk,
      duration: ctx.input.duration,
      fps: ctx.input.fps,
      layers: ctx.input.layers,
      pages: ctx.input.pages,
      merge: ctx.input.merge
    });

    let format = ctx.input.format || 'jpg';
    let isArray = Array.isArray(result);
    let count = isArray ? result.length : 1;
    let url = isArray ? result[0]?.url : result?.url;

    return {
      output: result,
      message: `Generated ${count} render(s) in **${format}** format.${url ? ` Output: ${url}` : ''}`
    };
  })
  .build();
