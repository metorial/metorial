import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate a new image from a text prompt using AI, or transform an existing image using prompt-based generation.
Supports multiple AI models and adapter types for different generation modes: text-to-image, image-to-image transformation, edge-based generation, and generative upscaling.`,
  instructions: [
    'For text-only generation, provide just a prompt and optionally width/height.',
    'For image-to-image, provide both a sourceImageUrl and a prompt.',
    'Use adapterType "control" for edge-guided generation, "control2" for edge-only (drawings).',
    'The prompt is automatically appended with "high quality, highly detailed, 8K".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      prompt: z.string().describe('Text description of the image to generate'),
      sourceImageUrl: z
        .string()
        .optional()
        .describe('URL of an input image for image-to-image generation'),
      modelType: z
        .enum([
          'realistic',
          'fantasy',
          'premium',
          'z-image-turbo',
          'flux2-klein9b',
          'qwen',
          'see-dream-4.5',
          'gemini-3-pro-image-preview',
          'google-gemini-image-flash'
        ])
        .optional()
        .describe('AI model to use for generation'),
      adapterType: z
        .enum(['generate_background', 'control', 'control2', 'upscale'])
        .optional()
        .describe(
          'Generation adapter: generate_background (default), control (image+edges), control2 (edges only), upscale (generative upscale)'
        ),
      sampleNum: z.number().optional().describe('Seed value for reproducible results'),
      controlnetConditioningScale: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Edge preservation intensity for control adapters (0-1, default 0.5)'),
      width: z.number().optional().describe('Target output width in pixels'),
      height: z.number().optional().describe('Target output height in pixels'),
      generativeUpscale: z
        .boolean()
        .optional()
        .describe('Enable generative upscaling to target dimensions'),
      outputFormat: z.enum(['jpg', 'png', 'webp']).optional().describe('Output image format')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Processing status'),
      jobId: z.string().describe('Job identifier for tracking'),
      resultUrl: z.string().optional().describe('URL to the generated image when complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.processImageSync({
      url: ctx.input.sourceImageUrl,
      width: ctx.input.width,
      height: ctx.input.height,
      generativeUpscale: ctx.input.generativeUpscale,
      outputFormat: ctx.input.outputFormat,
      background: {
        generate: {
          description: ctx.input.prompt,
          modelType: ctx.input.modelType,
          adapterType: ctx.input.adapterType,
          sampleNum: ctx.input.sampleNum,
          controlnetConditioningScale: ctx.input.controlnetConditioningScale
        }
      }
    });

    let message =
      result.status === 'complete'
        ? `Image generated successfully. Result: ${result.resultUrl}`
        : `Image generation started (status: **${result.status}**). Job ID: \`${result.jobId}\`.`;

    return {
      output: result,
      message
    };
  })
  .build();
