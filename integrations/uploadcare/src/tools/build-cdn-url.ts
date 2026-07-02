import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let buildCdnUrl = SlateTool.create(spec, {
  name: 'Build Image CDN URL',
  key: 'build_cdn_url',
  description: `Construct an Uploadcare CDN URL with image processing operations. Operations are chained in order and applied on-the-fly when the URL is accessed. Useful for generating optimized image URLs for display.`,
  instructions: [
    'Operations are applied in the order specified. The resulting URL can be used directly in web pages or applications.',
    'Only works with image files stored on Uploadcare.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('UUID of the image file'),
      operations: z
        .array(
          z.object({
            operation: z
              .enum([
                'preview',
                'resize',
                'crop',
                'scale_crop',
                'smart_resize',
                'autorotate',
                'rotate',
                'flip',
                'mirror',
                'format',
                'quality',
                'progressive',
                'blur',
                'sharp',
                'enhance',
                'grayscale',
                'invert',
                'brightness',
                'contrast',
                'saturation'
              ])
              .describe('Image processing operation'),
            value: z
              .string()
              .optional()
              .describe('Operation value/parameters (e.g. "300x200", "90", "webp", "smart")')
          })
        )
        .describe('Ordered list of image processing operations to apply'),
      filename: z.string().optional().describe('Optional filename to append to the URL')
    })
  )
  .output(
    z.object({
      cdnUrl: z.string().describe('Complete CDN URL with all operations applied')
    })
  )
  .handleInvocation(async ctx => {
    let cdnBase = ctx.config.cdnBaseUrl || 'https://ucarecdn.com';
    let url = `${cdnBase}/${ctx.input.fileId}/`;

    for (let op of ctx.input.operations) {
      if (op.value) {
        url += `-/${op.operation}/${op.value}/`;
      } else {
        url += `-/${op.operation}/`;
      }
    }

    if (ctx.input.filename) {
      url += ctx.input.filename;
    }

    return {
      output: { cdnUrl: url },
      message: `Built CDN URL with **${ctx.input.operations.length}** operation(s): ${url}`
    };
  })
  .build();
