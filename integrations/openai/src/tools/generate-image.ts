import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate images from text prompts using OpenAI's image generation models (e.g. DALL·E 3, gpt-image-1). Returns URLs or base64-encoded images. Supports configurable size, quality, and style.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      prompt: z.string().describe('Text description of the image to generate'),
      model: z
        .string()
        .optional()
        .describe(
          'Model to use (e.g. "dall-e-3", "gpt-image-1"). Defaults to the latest available model.'
        ),
      n: z.number().min(1).max(10).optional().describe('Number of images to generate (1-10)'),
      quality: z
        .enum(['standard', 'hd', 'low', 'medium', 'high', 'auto'])
        .optional()
        .describe('Quality of the generated image'),
      size: z
        .enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'])
        .optional()
        .describe('Size of the generated image'),
      style: z
        .enum(['vivid', 'natural'])
        .optional()
        .describe('Style of the generated image (DALL·E 3 only)'),
      outputFormat: z
        .enum(['url', 'b64_json'])
        .optional()
        .describe(
          'Format of the response. "url" returns temporary URLs, "b64_json" returns base64-encoded images.'
        ),
      user: z.string().optional().describe('Unique identifier for the end-user')
    })
  )
  .output(
    z.object({
      images: z
        .array(
          z.object({
            url: z.string().optional().describe('Temporary URL of the generated image'),
            b64Json: z.string().optional().describe('Base64-encoded image data'),
            revisedPrompt: z
              .string()
              .optional()
              .describe('Revised prompt used for generation (DALL·E 3)')
          })
        )
        .describe('Generated images'),
      createdAt: z.number().describe('Unix timestamp when images were created')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createImage({
      prompt: ctx.input.prompt,
      model: ctx.input.model,
      n: ctx.input.n,
      quality: ctx.input.quality,
      size: ctx.input.size,
      style: ctx.input.style,
      responseFormat: ctx.input.outputFormat,
      user: ctx.input.user
    });

    let images = (result.data ?? []).map((img: any) => ({
      url: img.url,
      b64Json: img.b64_json,
      revisedPrompt: img.revised_prompt
    }));

    return {
      output: {
        images,
        createdAt: result.created
      },
      message: `Generated **${images.length}** image(s) from prompt.`
    };
  })
  .build();
