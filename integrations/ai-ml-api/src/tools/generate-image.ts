import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate images from text prompts using 70+ image models including Flux, DALL-E, Stable Diffusion, Imagen, and more.
Supports configurable resolution, aspect ratio, negative prompts, guidance scale, and seed for reproducibility.
Returns URLs to the generated images.`,
  instructions: [
    'Use model IDs like "flux/schnell", "openai/gpt-image-1", "google/imagen-3.0-generate-002", "stability-ai/stable-diffusion-3".',
    'Not all parameters are supported by all models. Size, aspect ratio, and negative prompt availability depend on the chosen model.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Image model ID, e.g. "flux/schnell", "openai/gpt-image-1", "google/imagen-3.0-generate-002"'
        ),
      prompt: z.string().describe('Text description of the desired image'),
      negativePrompt: z
        .string()
        .optional()
        .describe('Description of elements to avoid in the generated image'),
      n: z.number().min(1).max(10).optional().describe('Number of images to generate'),
      size: z
        .string()
        .optional()
        .describe('Image size, e.g. "1024x1024", "1536x1024", "square_hd", "landscape_16_9"'),
      aspectRatio: z.string().optional().describe('Aspect ratio, e.g. "16:9", "1:1", "4:3"'),
      seed: z.number().optional().describe('Seed for reproducible generation'),
      guidanceScale: z
        .number()
        .optional()
        .describe('Classifier Free Guidance scale - how closely to follow the prompt'),
      enhancePrompt: z
        .boolean()
        .optional()
        .describe('Use LLM-based prompt rewriting for higher quality. Default: true')
    })
  )
  .output(
    z.object({
      images: z
        .array(
          z.object({
            url: z.string().optional().describe('URL of the generated image'),
            revisedPrompt: z
              .string()
              .optional()
              .describe('The enhanced prompt used for generation, if available')
          })
        )
        .describe('Array of generated images'),
      imageCount: z.number().describe('Number of images generated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.generateImage({
      model: ctx.input.model,
      prompt: ctx.input.prompt,
      negativePrompt: ctx.input.negativePrompt,
      n: ctx.input.n,
      size: ctx.input.size,
      aspectRatio: ctx.input.aspectRatio,
      seed: ctx.input.seed,
      guidanceScale: ctx.input.guidanceScale,
      enhancePrompt: ctx.input.enhancePrompt
    });

    let images = (result.data ?? []).map(img => ({
      url: img.url ?? img.b64_json,
      revisedPrompt: img.revised_prompt
    }));

    return {
      output: {
        images,
        imageCount: images.length
      },
      message: `Generated **${images.length}** image(s) using **${ctx.input.model}**. Prompt: "${ctx.input.prompt.substring(0, 100)}${ctx.input.prompt.length > 100 ? '...' : ''}"`
    };
  })
  .build();
