import { SlateTool } from 'slates';
import { z } from 'zod';
import { FireflyClient } from '../lib/firefly';
import { spec } from '../spec';

export let generativeFill = SlateTool.create(spec, {
  name: 'Generative Fill',
  key: 'generative_fill',
  description: `Fill a masked area of an image with AI-generated content using Adobe Firefly. Provide an input image, a mask image (white areas are filled), and an optional text prompt to guide the generation. Returns the filled image URLs.`,
  constraints: [
    'Requires enterprise plan with Firefly API access.',
    'Input image and mask must be accessible via URL.'
  ]
})
  .input(
    z.object({
      imageUrl: z.string().describe('URL of the input image'),
      maskUrl: z
        .string()
        .describe('URL of the mask image (white = fill area, black = preserve)'),
      prompt: z
        .string()
        .optional()
        .describe('Text prompt to guide what is generated in the masked area'),
      numVariations: z
        .number()
        .optional()
        .describe('Number of variations to generate (default: 1)'),
      width: z.number().optional().describe('Output width in pixels'),
      height: z.number().optional().describe('Output height in pixels')
    })
  )
  .output(
    z.object({
      images: z.array(
        z.object({
          imageUrl: z.string().describe('URL of the resulting image'),
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

    let result = await client.generativeFill({
      image: { source: { url: ctx.input.imageUrl } },
      mask: { source: { url: ctx.input.maskUrl } },
      prompt: ctx.input.prompt,
      numVariations: ctx.input.numVariations,
      size:
        ctx.input.width && ctx.input.height
          ? { width: ctx.input.width, height: ctx.input.height }
          : undefined
    });

    let images = (result.outputs || result.images || []).map((img: any) => ({
      imageUrl: img.image?.url || img.url,
      seed: img.seed
    }));

    return {
      output: { images },
      message: `Generated **${images.length}** generative fill result(s).${ctx.input.prompt ? ` Prompt: "${ctx.input.prompt}"` : ''}`
    };
  })
  .build();
