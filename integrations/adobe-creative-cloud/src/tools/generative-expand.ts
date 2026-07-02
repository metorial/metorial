import { SlateTool } from 'slates';
import { z } from 'zod';
import { FireflyClient } from '../lib/firefly';
import { spec } from '../spec';

export let generativeExpand = SlateTool.create(spec, {
  name: 'Generative Expand',
  key: 'generative_expand',
  description: `Expand an image beyond its original boundaries using Adobe Firefly AI. Specify the target size and optional placement insets to control how the image is expanded. Optionally provide a text prompt to guide the generated content in the expanded areas.`,
  constraints: [
    'Requires enterprise plan with Firefly API access.',
    'Input image must be accessible via URL.'
  ]
})
  .input(
    z.object({
      imageUrl: z.string().describe('URL of the input image to expand'),
      width: z.number().describe('Target width in pixels'),
      height: z.number().describe('Target height in pixels'),
      prompt: z
        .string()
        .optional()
        .describe('Text prompt to guide the content generated in expanded areas'),
      numVariations: z
        .number()
        .optional()
        .describe('Number of variations to generate (default: 1)'),
      insetLeft: z.number().optional().describe('Left inset in pixels for image placement'),
      insetTop: z.number().optional().describe('Top inset in pixels for image placement'),
      insetRight: z.number().optional().describe('Right inset in pixels for image placement'),
      insetBottom: z.number().optional().describe('Bottom inset in pixels for image placement')
    })
  )
  .output(
    z.object({
      images: z.array(
        z.object({
          imageUrl: z.string().describe('URL of the expanded image'),
          seed: z.number().optional().describe('Seed value used')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new FireflyClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    let placement =
      ctx.input.insetLeft !== undefined ||
      ctx.input.insetTop !== undefined ||
      ctx.input.insetRight !== undefined ||
      ctx.input.insetBottom !== undefined
        ? {
            insets: {
              left: ctx.input.insetLeft || 0,
              top: ctx.input.insetTop || 0,
              right: ctx.input.insetRight || 0,
              bottom: ctx.input.insetBottom || 0
            }
          }
        : undefined;

    let result = await client.generativeExpand({
      image: { source: { url: ctx.input.imageUrl } },
      size: { width: ctx.input.width, height: ctx.input.height },
      prompt: ctx.input.prompt,
      numVariations: ctx.input.numVariations,
      placement
    });

    let images = (result.outputs || result.images || []).map((img: any) => ({
      imageUrl: img.image?.url || img.url,
      seed: img.seed
    }));

    return {
      output: { images },
      message: `Generated **${images.length}** expanded image(s) at ${ctx.input.width}x${ctx.input.height}px.`
    };
  })
  .build();
