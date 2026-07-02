import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateFashionModel = SlateTool.create(spec, {
  name: 'Generate Fashion Model',
  key: 'generate_fashion_model',
  description: `Generate AI fashion model photoshoots from flat-lay or mannequin garment photos. Provide clothing image URLs and optionally a model image to create realistic images of models wearing the garments.

This is an async operation — a task ID is returned immediately for status polling.`,
  instructions: [
    'Provide 1–5 clothing image URLs. You can combine multiple garments into a complete outfit.',
    'Optionally provide a model image URL. If omitted, a random suitable model is chosen.',
    'Use the Get Job Status tool to poll for completion.'
  ],
  constraints: [
    'Up to 5 garment images per request.',
    '1–4 output images per request.',
    'Swimwear and lingerie may be flagged by safety filters.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      clothingUrls: z.array(z.string()).min(1).max(5).describe('URLs of garment images (1–5)'),
      modelImageUrl: z
        .string()
        .optional()
        .describe('URL of the desired model image. Omit for a randomly chosen model.'),
      numberOfImages: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('Number of output images (1–4, default: 1)'),
      pose: z
        .string()
        .optional()
        .describe(
          'Pose description (e.g. "full body, front view, neutral stance, arms relaxed")'
        ),
      background: z
        .string()
        .optional()
        .describe('Background description (e.g. "minimalistic studio background")'),
      aspectRatio: z
        .enum(['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9', '4:5', '5:4'])
        .optional()
        .describe('Output aspect ratio'),
      outputFormat: z
        .enum(['png', 'jpeg'])
        .optional()
        .describe('Output image format (default: png)'),
      outputDestination: z.string().optional().describe('Storage URI for output')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Async task ID for status polling'),
      status: z.string().describe('Current processing status'),
      resultUrl: z.string().describe('URL to poll for results'),
      createdAt: z.string().describe('Task creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: Record<string, unknown> = {
      clothing: ctx.input.clothingUrls
    };
    if (ctx.input.modelImageUrl) {
      input.model = ctx.input.modelImageUrl;
    }

    let output: Record<string, unknown> = {};
    if (ctx.input.numberOfImages) output.number_of_images = ctx.input.numberOfImages;
    if (ctx.input.outputFormat) output.format = ctx.input.outputFormat;
    if (ctx.input.outputDestination) output.destination = ctx.input.outputDestination;

    let options: Record<string, unknown> = {};
    if (ctx.input.pose) options.pose = ctx.input.pose;
    if (ctx.input.background) options.background = ctx.input.background;
    if (ctx.input.aspectRatio) options.aspect_ratio = ctx.input.aspectRatio;

    ctx.info('Submitting AI fashion model generation request');
    let result = await client.generateFashionModel({
      input: input as any,
      output: Object.keys(output).length > 0 ? output : undefined,
      options: Object.keys(options).length > 0 ? options : undefined
    });

    let data = result.data;

    return {
      output: {
        taskId: data.id,
        status: data.status,
        resultUrl: data.result_url,
        createdAt: data.created_at
      },
      message: `Fashion model generation submitted. Task ID: **${data.id}**, status: **${data.status}**. Poll the result URL to check progress.`
    };
  })
  .build();
