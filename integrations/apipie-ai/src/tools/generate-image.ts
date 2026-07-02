import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Create images using AI models from various providers such as DALL-E 3, Stable Diffusion, Flux, and more. Supports generating original images from text prompts and editing existing images.`,
  instructions: [
    'Use "dall-e-3" for high-quality image generation. "flux-pro" and "stable-diffusion-3" are also available.',
    'The "image" parameter allows you to provide a source image URL for editing/variations (not supported by all models).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Image model to use (e.g., "dall-e-3", "dall-e-2", "stable-diffusion-3", "flux-pro", "flux-schnell")'
        ),
      prompt: z.string().describe('Text description of the desired image'),
      provider: z
        .string()
        .optional()
        .describe('Specific provider to use. Omit for auto-selection.'),
      n: z
        .number()
        .optional()
        .describe('Number of images to generate (currently only 1 supported by most models)'),
      size: z
        .enum(['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'])
        .optional()
        .describe('Image dimensions'),
      quality: z.enum(['standard', 'hd']).optional().describe('Image quality level'),
      style: z.enum(['natural', 'vivid']).optional().describe('Image style preference'),
      responseFormat: z
        .enum(['url', 'b64_json'])
        .optional()
        .describe('Response format for the generated image'),
      image: z
        .string()
        .optional()
        .describe('URL of a source image for editing/variations (not supported by DALL-E 3)')
    })
  )
  .output(
    z.object({
      images: z
        .array(
          z.object({
            url: z.string().optional().describe('URL of the generated image'),
            base64: z.string().optional().describe('Base64-encoded image data'),
            revisedPrompt: z
              .string()
              .optional()
              .describe('The revised prompt used by the model')
          })
        )
        .describe('Generated image data'),
      cost: z.number().optional().describe('Cost of this request in USD'),
      latencyMs: z.number().optional().describe('Response latency in milliseconds'),
      modelUsed: z.string().optional().describe('The model that was actually used'),
      imageSize: z.string().optional().describe('Dimensions of the generated image')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.generateImage({
      model: ctx.input.model,
      prompt: ctx.input.prompt,
      provider: ctx.input.provider,
      n: ctx.input.n,
      size: ctx.input.size,
      quality: ctx.input.quality,
      style: ctx.input.style,
      responseFormat: ctx.input.responseFormat,
      image: ctx.input.image
    });

    let images = (result.data ?? []).map((img: any) => ({
      url: img.url,
      base64: img.b64_json,
      revisedPrompt: img.revised_prompt
    }));

    let imageCount = images.length;

    return {
      output: {
        images,
        cost: result.usage?.cost,
        latencyMs: result.usage?.latency_ms,
        modelUsed: result.usage?.model_used,
        imageSize: result.usage?.image_size
      },
      message: `Generated **${imageCount}** image${imageCount !== 1 ? 's' : ''} using **${result.usage?.model_used ?? ctx.input.model}**${result.usage?.cost ? ` ($${result.usage.cost.toFixed(4)})` : ''}.${images[0]?.url ? `\n\n![Generated Image](${images[0].url})` : ''}`
    };
  })
  .build();
