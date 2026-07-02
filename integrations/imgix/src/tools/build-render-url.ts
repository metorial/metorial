import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let buildRenderUrl = SlateTool.create(spec, {
  name: 'Build Render URL',
  key: 'build_render_url',
  description: `Build an Imgix rendering URL with transformation parameters. Constructs a URL that applies real-time image transformations including resizing, cropping, format conversion, quality adjustment, watermarks, text overlays, blur, and more. The resulting URL can be used directly in HTML or applications for on-the-fly image processing.`,
  instructions: [
    'Common parameters: **w** (width), **h** (height), **fit** (crop, clip, fill, max, min, scale), **q** (quality 0-100), **auto** (compress, format, enhance), **fm** (jpg, png, webp, avif, gif).',
    'For cropping: use **crop** (top, bottom, left, right, faces, focalpoint, entropy, edges) with **fit=crop**.',
    'For text overlays: use **txt**, **txt-size**, **txt-color**, **txt-font**, etc.',
    'For watermarks: use **mark**, **mark-w**, **mark-h**, **mark-align**, etc.',
    'For AI features: use **bg-remove=true** for background removal.',
    'Max canvas size is 8192x8192 pixels.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Imgix source domain (e.g., "example.imgix.net")'),
      path: z.string().describe('Image path within the source (e.g., "/images/photo.jpg")'),
      params: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Rendering parameters as key-value pairs (e.g., {"w": "800", "h": "600", "fit": "crop", "auto": "compress,format"})'
        )
    })
  )
  .output(
    z.object({
      renderUrl: z.string().describe('The fully constructed Imgix rendering URL')
    })
  )
  .handleInvocation(async ctx => {
    let path = ctx.input.path.startsWith('/') ? ctx.input.path : `/${ctx.input.path}`;

    let queryParts: string[] = [];
    if (ctx.input.params) {
      for (let [key, value] of Object.entries(ctx.input.params)) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }

    let queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    let renderUrl = `https://${ctx.input.domain}${path}${queryString}`;

    return {
      output: { renderUrl },
      message: `Built rendering URL: \`${renderUrl}\``
    };
  })
  .build();
