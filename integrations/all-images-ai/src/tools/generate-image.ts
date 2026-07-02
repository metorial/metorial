import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let generationParamSchema = z.object({
  name: z.string().describe('Parameter name'),
  value: z.string().describe('Parameter value')
});

let imageSchema = z.object({
  imageId: z.string().describe('Image ID'),
  url: z.string().describe('Preview image URL'),
  urlFull: z.string().describe('Full-size image URL'),
  validated: z.boolean().optional().describe('Whether the image was validated'),
  free: z.boolean().optional().describe('Whether the image is free'),
  titles: z.record(z.string(), z.string()).optional().describe('Image titles by language')
});

let generationOutputSchema = z.object({
  generationId: z.string().describe('Generation ID'),
  name: z.string().describe('Generation name'),
  prompt: z.string().describe('The prompt used'),
  status: z
    .number()
    .describe('Status code: 0=created, 1=pending, 2=processing, 3=done, 4=error'),
  statusLabel: z.string().describe('Human-readable status label'),
  params: z.array(generationParamSchema).describe('Generation parameters'),
  processMode: z.string().optional().describe('Processing mode (fast or relax)'),
  images: z.array(imageSchema).describe('Generated images (available when status is done)'),
  nbImages: z.number().optional().describe('Number of images'),
  tags: z.array(z.string()).optional().describe('Tags'),
  metaData: z.record(z.string(), z.unknown()).optional().describe('Custom metadata'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Create an AI-generated image from a text description using Midjourney AI. Each generation produces 4 image proposals. Supports **simple mode** (plain text with optional parameters like format, weather, time of day, camera) and **advanced mode** (raw Midjourney "Imagine" prompts). Generation is asynchronous — use the "Get Generation" tool to check status and retrieve results.`,
  instructions: [
    'In simple mode, do not include Midjourney parameters in the prompt.',
    'In advanced mode, include Midjourney parameters directly in the prompt string (e.g., "--aspect 3:2").',
    'The optimizePrompt option rewrites simple-mode descriptions for better image quality.',
    'processMode (fast/relax) is only available for Dedicated plan users.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the generation'),
      mode: z
        .enum(['simple', 'advanced'])
        .describe(
          'Generation mode: "simple" for plain text with parameters, "advanced" for raw Midjourney prompts'
        ),
      prompt: z
        .string()
        .describe(
          'Image description (simple mode) or Midjourney Imagine prompt (advanced mode). Max 4096 characters.'
        ),
      additionalPrompt: z
        .string()
        .optional()
        .describe(
          'Extra prompt text prepended to the main prompt, not affected by optimization. Max 1024 characters.'
        ),
      optimizePrompt: z
        .boolean()
        .optional()
        .describe('Rewrite the prompt for better results (simple mode only)'),
      photoType: z
        .enum(['realisticQuality', 'realisticManuel'])
        .optional()
        .describe('Photo type: high-quality realistic or smartphone-style (simple mode)'),
      aspectRatio: z
        .enum(['1:1', '3:2', '2:3', '4:7', '7:4', '5:4', '4:5', '16:9', '9:16'])
        .optional()
        .describe('Image aspect ratio (simple mode)'),
      weather: z
        .enum(['sunny', 'cloudy', 'foggy', 'rainy', 'thunderstorm', 'snowy'])
        .optional()
        .describe('Weather condition (simple mode)'),
      timeOfDay: z
        .enum([
          'sunrise',
          'morning',
          'afternoon',
          'sunset',
          'evening',
          'golden hour',
          'night',
          'midnight'
        ])
        .optional()
        .describe('Time of day (simple mode)'),
      camera: z
        .string()
        .optional()
        .describe('Camera model, e.g., "GoPro", "Canon" (simple mode)'),
      chaos: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Variation in results, 0-100. Higher = more unexpected (simple mode)'),
      stylize: z
        .number()
        .min(0)
        .max(1000)
        .optional()
        .describe('Artistic stylization, 0-1000. Lower = more prompt-adherent (simple mode)'),
      interdiction: z
        .string()
        .optional()
        .describe('Comma-separated elements to exclude from the image (simple mode)'),
      referenceImageUrl: z
        .string()
        .optional()
        .describe('URL of a reference image (simple mode)'),
      processMode: z
        .enum(['relax', 'fast'])
        .optional()
        .describe('Processing mode (Dedicated plan only)'),
      tags: z.array(z.string()).optional().describe('Tags for organizing generations'),
      metaData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata to attach')
    })
  )
  .output(generationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: { name: string; value: string }[] = [];

    if (ctx.input.photoType) params.push({ name: 'sujetMode', value: ctx.input.photoType });
    if (ctx.input.aspectRatio) params.push({ name: 'format', value: ctx.input.aspectRatio });
    if (ctx.input.weather) params.push({ name: 'weather', value: ctx.input.weather });
    if (ctx.input.timeOfDay) params.push({ name: 'time', value: ctx.input.timeOfDay });
    if (ctx.input.camera) params.push({ name: 'camera', value: ctx.input.camera });
    if (ctx.input.chaos !== undefined)
      params.push({ name: 'chaos', value: String(ctx.input.chaos) });
    if (ctx.input.stylize !== undefined)
      params.push({ name: 'stylize', value: String(ctx.input.stylize) });
    if (ctx.input.interdiction)
      params.push({ name: 'interdiction', value: ctx.input.interdiction });
    if (ctx.input.referenceImageUrl)
      params.push({ name: 'fromImageUrl', value: ctx.input.referenceImageUrl });

    let generation = await client.createGeneration({
      name: ctx.input.name,
      mode: ctx.input.mode,
      prompt: ctx.input.prompt,
      additionalPrompt: ctx.input.additionalPrompt,
      optimizePrompt: ctx.input.optimizePrompt,
      params: params.length > 0 ? params : undefined,
      processMode: ctx.input.processMode,
      tags: ctx.input.tags,
      metaData: ctx.input.metaData
    });

    return {
      output: generation,
      message: `Image generation **"${generation.name}"** created (ID: \`${generation.generationId}\`). Status: **${generation.statusLabel}**. The generation will produce 4 images asynchronously.`
    };
  })
  .build();
