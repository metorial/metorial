import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let textToImage = SlateTool.create(spec, {
  name: 'Text to Image',
  key: 'text_to_image',
  description: `Create images from written text descriptions using AI. Provide a detailed prompt describing the image you want to generate and receive an AI-generated image.

Supports a wide range of styles and subjects — describe what you need and the AI will create it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe(
          'Detailed text description of the image to generate, e.g. "A futuristic cityscape at sunset with flying cars and neon lights"'
        )
    })
  )
  .output(
    z.object({
      generatedImage: z
        .any()
        .describe('The generated image data, URL, or base64-encoded content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Generating image from text...');

    let result = await client.textToImage({
      prompt: ctx.input.prompt
    });

    return {
      output: {
        generatedImage: result
      },
      message: `Successfully generated an image from the provided text description.`
    };
  })
  .build();
