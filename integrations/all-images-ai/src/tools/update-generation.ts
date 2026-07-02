import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateGeneration = SlateTool.create(spec, {
  name: 'Update Generation',
  key: 'update_generation',
  description: `Update an existing image generation's prompt, parameters, tags, or metadata. Only generations that are **not** in "pending" or "processing" status can be updated. Useful for modifying a failed generation before retrying.`,
  constraints: ['Cannot update generations that are in "pending" or "processing" status.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      generationId: z.string().describe('ID of the generation to update'),
      name: z.string().optional().describe('New name for the generation'),
      mode: z.enum(['simple', 'advanced']).optional().describe('Generation mode'),
      prompt: z
        .string()
        .optional()
        .describe('New image description or Midjourney prompt. Max 4096 characters.'),
      additionalPrompt: z
        .string()
        .optional()
        .describe('Additional prompt text. Max 1024 characters.'),
      optimizePrompt: z
        .boolean()
        .optional()
        .describe('Whether to optimize the prompt (simple mode)'),
      photoType: z
        .enum(['realisticQuality', 'realisticManuel'])
        .optional()
        .describe('Photo type (simple mode)'),
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
      camera: z.string().optional().describe('Camera model (simple mode)'),
      chaos: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Variation level 0-100 (simple mode)'),
      stylize: z
        .number()
        .min(0)
        .max(1000)
        .optional()
        .describe('Stylization level 0-1000 (simple mode)'),
      interdiction: z
        .string()
        .optional()
        .describe('Comma-separated elements to exclude (simple mode)'),
      processMode: z
        .enum(['relax', 'fast'])
        .optional()
        .describe('Processing mode (Dedicated plan only)'),
      tags: z.array(z.string()).optional().describe('New tags'),
      metaData: z.record(z.string(), z.unknown()).optional().describe('New metadata')
    })
  )
  .output(
    z.object({
      generationId: z.string().describe('Generation ID'),
      name: z.string().describe('Generation name'),
      prompt: z.string().describe('The prompt'),
      status: z.number().describe('Status code'),
      statusLabel: z.string().describe('Human-readable status'),
      params: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .describe('Generation parameters'),
      processMode: z.string().optional(),
      images: z
        .array(
          z.object({
            imageId: z.string(),
            url: z.string(),
            urlFull: z.string(),
            validated: z.boolean().optional(),
            free: z.boolean().optional(),
            titles: z.record(z.string(), z.string()).optional()
          })
        )
        .describe('Generated images'),
      nbImages: z.number().optional(),
      tags: z.array(z.string()).optional(),
      metaData: z.record(z.string(), z.unknown()).optional(),
      createdAt: z.string().optional()
    })
  )
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

    let generation = await client.updateGeneration(ctx.input.generationId, {
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
      message: `Generation **"${generation.name}"** (\`${generation.generationId}\`) updated successfully. Status: **${generation.statusLabel}**.`
    };
  })
  .build();
