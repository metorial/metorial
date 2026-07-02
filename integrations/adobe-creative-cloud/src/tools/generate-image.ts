import { SlateTool } from 'slates';
import { z } from 'zod';
import { FireflyClient } from '../lib/firefly';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate images from text prompts using Adobe Firefly AI. Supports customizing image dimensions, content class, style presets, and number of variations. Returns generated image URLs. This is a synchronous API — results are returned directly in the response.`,
  constraints: [
    'Requires enterprise plan with Firefly API access.',
    'Content must comply with Adobe Firefly usage policies.'
  ]
})
  .input(
    z.object({
      prompt: z.string().describe('Text description of the image to generate'),
      negativePrompt: z
        .string()
        .optional()
        .describe('Text describing what to exclude from the generated image'),
      numVariations: z
        .number()
        .optional()
        .describe('Number of image variations to generate (default: 1, max: 4)'),
      width: z.number().optional().describe('Width of generated image in pixels'),
      height: z.number().optional().describe('Height of generated image in pixels'),
      contentClass: z.enum(['photo', 'art']).optional().describe('Content style class'),
      stylePresets: z
        .array(z.string())
        .optional()
        .describe('Style preset identifiers to apply'),
      seeds: z.array(z.number()).optional().describe('Seed values for reproducible results'),
      visualIntensity: z.number().optional().describe('Visual intensity of the style (1-100)'),
      locale: z.string().optional().describe('Locale for prompt interpretation (e.g. en-US)')
    })
  )
  .output(
    z.object({
      images: z.array(
        z.object({
          imageUrl: z.string().describe('URL of the generated image'),
          seed: z.number().optional().describe('Seed value used for this image')
        })
      ),
      contentClass: z.string().optional().describe('Content class applied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FireflyClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    let result = await client.generateImages({
      prompt: ctx.input.prompt,
      negativePrompt: ctx.input.negativePrompt,
      numVariations: ctx.input.numVariations,
      size:
        ctx.input.width && ctx.input.height
          ? { width: ctx.input.width, height: ctx.input.height }
          : undefined,
      contentClass: ctx.input.contentClass,
      style: ctx.input.stylePresets
        ? { presets: ctx.input.stylePresets, strength: ctx.input.visualIntensity }
        : undefined,
      seeds: ctx.input.seeds,
      locale: ctx.input.locale
    });

    let images = (result.outputs || result.images || []).map((img: any) => ({
      imageUrl: img.image?.url || img.url,
      seed: img.seed
    }));

    return {
      output: {
        images,
        contentClass: result.contentClass
      },
      message: `Generated **${images.length}** image(s) from prompt: "${ctx.input.prompt.substring(0, 80)}${ctx.input.prompt.length > 80 ? '...' : ''}"`
    };
  })
  .build();
