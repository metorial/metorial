import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let generatedImageSchema = z.object({
  url: z.string().describe('URL of the generated image')
});

export let generateImages = SlateTool.create(spec, {
  name: 'Generate Images',
  key: 'generate_images',
  description: `Generate AI images using various providers including OpenAI DALL-E, Together AI Flux, Google Imagen, and more. Requires an LLM provider API key for the image generation provider.`,
  instructions: [
    'Model must be in provider:model format, e.g. "openai:gpt-image-1", "together:flux-1".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      prompt: z.string().describe('Text description of the image to generate'),
      model: z
        .string()
        .describe('Image model in provider:model format, e.g. "openai:gpt-image-1"'),
      llmProviderKey: z.string().describe('API key for the image generation provider'),
      width: z.number().optional().describe('Width of the generated image in pixels'),
      height: z.number().optional().describe('Height of the generated image in pixels'),
      size: z
        .string()
        .optional()
        .describe('Provider size string, e.g. "1024x1024", for models that support it'),
      n: z.number().optional().describe('Number of images to generate'),
      steps: z.number().optional().describe('Number of generation steps (provider-dependent)'),
      imageUrl: z.string().optional().describe('Base image URL for image-to-image generation')
    })
  )
  .output(
    z.object({
      images: z.array(generatedImageSchema).describe('Generated images with URLs'),
      model: z.string().optional().describe('Model used for generation'),
      provider: z.string().optional().describe('Provider used for generation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      prompt: ctx.input.prompt,
      model: ctx.input.model
    };

    if (ctx.input.width !== undefined) body.width = ctx.input.width;
    if (ctx.input.height !== undefined) body.height = ctx.input.height;
    if (ctx.input.size !== undefined) body.size = ctx.input.size;
    if (ctx.input.n !== undefined) body.n = ctx.input.n;
    if (ctx.input.steps !== undefined) body.steps = ctx.input.steps;
    if (ctx.input.imageUrl !== undefined) body.image_url = ctx.input.imageUrl;

    let result = await client.generateImages(body, ctx.input.llmProviderKey);

    let images = (result.choices ?? []).flatMap((c: any) =>
      (c.message?.images ?? []).map((img: any) => ({
        url: img.image_url?.url ?? img.url ?? ''
      }))
    );

    return {
      output: {
        images,
        model: result.model,
        provider: result.provider
      },
      message: `Generated **${images.length}** image(s) using \`${result.model ?? ctx.input.model}\`.`
    };
  })
  .build();
