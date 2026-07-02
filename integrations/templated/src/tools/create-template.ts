import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let layerSchema = z
  .object({
    layer: z.string().describe('Layer identifier/name'),
    type: z.enum(['text', 'image', 'shape']).describe('Layer type'),
    x: z.number().describe('X position in pixels'),
    y: z.number().describe('Y position in pixels'),
    width: z.number().describe('Layer width in pixels'),
    height: z.number().describe('Layer height in pixels'),
    group: z.string().optional().describe('Group name for grouping layers'),
    text: z.string().optional().describe('Text content (for text layers)'),
    color: z.string().optional().describe('Text or shape color in hex'),
    font_family: z.string().optional().describe('Font family name'),
    font_size: z.string().optional().describe('Font size (CSS value, e.g. "24px")'),
    image_url: z.string().optional().describe('Image URL (for image layers)'),
    background: z.string().optional().describe('Background color in hex'),
    opacity: z.number().optional().describe('Opacity from 0 to 1'),
    rotation: z.number().optional().describe('Rotation in degrees')
  })
  .passthrough();

let pageInputSchema = z.object({
  page: z.string().describe('Unique page identifier'),
  layers: z.array(layerSchema).describe('Layers for this page'),
  width: z.number().optional().describe('Page-specific width override'),
  height: z.number().optional().describe('Page-specific height override')
});

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Programmatically create a new template by composing layers (text, image, shape) with specific positioning, dimensions, and styling. Supports both single-page and multi-page templates.
Use **layers** for single-page designs or **pages** for multi-page templates (carousels, PDF documents).`,
  constraints: [
    'Width and height max is 5000 pixels.',
    'Use either layers or pages, not both.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Template name'),
      width: z.number().describe('Template width in pixels (max 5000)'),
      height: z.number().describe('Template height in pixels (max 5000)'),
      layers: z.array(layerSchema).optional().describe('Layers for single-page template'),
      pages: z
        .array(pageInputSchema)
        .optional()
        .describe('Pages with layers for multi-page template'),
      duration: z
        .number()
        .optional()
        .describe('Default video duration in milliseconds for MP4 renders')
    })
  )
  .output(
    z.object({
      templateId: z.string().optional(),
      name: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.createTemplate({
      name: ctx.input.name,
      width: ctx.input.width,
      height: ctx.input.height,
      layers: ctx.input.layers,
      pages: ctx.input.pages,
      duration: ctx.input.duration
    });

    return {
      output: {
        templateId: result.id,
        name: result.name,
        width: result.width,
        height: result.height,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Created template **${result.name}** (${result.width}x${result.height}) with ID \`${result.id}\`.`
    };
  })
  .build();
