import { SlateTool } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

export let exportImages = SlateTool.create(spec, {
  name: 'Export Images',
  key: 'export_images',
  description: `Render specific nodes from a Figma file as images. Returns download URLs for each requested node in PNG, SVG, JPG, or PDF format. URLs expire after 14 days.`,
  constraints: ['Image URLs expire after no more than 14 days'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('The key of the Figma file'),
      nodeIds: z.array(z.string()).describe('Node IDs to export as images'),
      format: z
        .enum(['png', 'jpg', 'svg', 'pdf'])
        .optional()
        .default('png')
        .describe('Image output format'),
      scale: z.number().optional().describe('Image scale factor (0.01 to 4)'),
      svgOutlineText: z
        .boolean()
        .optional()
        .describe('For SVG: whether text elements should be outlined'),
      svgIncludeId: z
        .boolean()
        .optional()
        .describe('For SVG: whether to include id attributes for all elements'),
      svgIncludeNodeId: z
        .boolean()
        .optional()
        .describe('For SVG: whether to include node IDs as data attributes'),
      svgSimplifyStroke: z
        .boolean()
        .optional()
        .describe('For SVG: whether to simplify inside/outside strokes'),
      contentsOnly: z
        .boolean()
        .optional()
        .describe('Whether to render only the content and not clip to the node bounds'),
      useAbsoluteBounds: z
        .boolean()
        .optional()
        .describe('Use full dimensions of the node regardless of cropping')
    })
  )
  .output(
    z.object({
      images: z
        .record(z.string(), z.string().nullable())
        .describe('Map of node IDs to image download URLs (null if rendering failed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);

    let result = await client.getImages(ctx.input.fileKey, {
      ids: ctx.input.nodeIds,
      format: ctx.input.format,
      scale: ctx.input.scale,
      svgOutlineText: ctx.input.svgOutlineText,
      svgIncludeId: ctx.input.svgIncludeId,
      svgIncludeNodeId: ctx.input.svgIncludeNodeId,
      svgSimplifyStroke: ctx.input.svgSimplifyStroke,
      contentsOnly: ctx.input.contentsOnly,
      useAbsoluteBounds: ctx.input.useAbsoluteBounds
    });

    let imageCount = Object.keys(result.images || {}).length;
    let successCount = Object.values(result.images || {}).filter(v => v !== null).length;

    return {
      output: {
        images: result.images || {}
      },
      message: `Exported ${successCount}/${imageCount} node(s) as **${ctx.input.format}** images`
    };
  })
  .build();
