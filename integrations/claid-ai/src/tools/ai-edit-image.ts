import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateWholeNumber } from '../lib/responses';
import { spec } from '../spec';

export let aiEditImage = SlateTool.create(spec, {
  name: 'AI Edit Image',
  key: 'ai_edit_image',
  description:
    'Edit an image using natural-language instructions. Submit an asynchronous job with the current v2 model or select v1 for custom aspect ratio and generation controls.',
  instructions: [
    'Use get_ai_edit_status with the returned taskId to retrieve the finished images.',
    'Aspect ratio, inference steps, and guidance scale are supported only by model v1.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      imageUrl: z.string().describe('Public source image URL or connected storage URI'),
      prompt: z
        .string()
        .min(3)
        .max(5000)
        .describe('Instructions describing the changes to make'),
      model: z.enum(['v1', 'v2']).optional().describe('Editing model. Defaults to v2.'),
      aspectRatio: z
        .enum(['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '9:21', '21:9'])
        .optional()
        .describe('Output aspect ratio, supported by v1 only'),
      inferenceSteps: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Inference steps, supported by v1 only'),
      guidanceScale: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Prompt adherence, supported by v1 only'),
      numberOfImages: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('Output image count, default 1'),
      outputFormat: z
        .enum(['jpeg', 'png'])
        .optional()
        .describe('Output image format, default png'),
      outputDestination: z
        .string()
        .optional()
        .describe('Connected storage URI for persistent results')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Async task ID'),
      status: z.string().describe('Current processing status'),
      resultUrl: z.string().describe('Result status endpoint'),
      createdAt: z.string().describe('Task creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    validateWholeNumber(ctx.input.inferenceSteps, 'inferenceSteps');
    validateWholeNumber(ctx.input.numberOfImages, 'numberOfImages');
    if (
      (ctx.input.model ?? 'v2') !== 'v1' &&
      [ctx.input.aspectRatio, ctx.input.inferenceSteps, ctx.input.guidanceScale].some(
        value => value !== undefined
      )
    ) {
      throw createApiServiceError(
        'Select model v1 to use aspectRatio, inferenceSteps, or guidanceScale.'
      );
    }
    let options = {
      prompt: ctx.input.prompt,
      ...(ctx.input.model !== undefined ? { model: ctx.input.model } : {}),
      ...(ctx.input.aspectRatio !== undefined ? { aspect_ratio: ctx.input.aspectRatio } : {}),
      ...(ctx.input.inferenceSteps !== undefined
        ? { inference_steps: ctx.input.inferenceSteps }
        : {}),
      ...(ctx.input.guidanceScale !== undefined
        ? { guidance_scale: ctx.input.guidanceScale }
        : {})
    };
    let output = {
      ...(ctx.input.numberOfImages !== undefined
        ? { number_of_images: ctx.input.numberOfImages }
        : {}),
      ...(ctx.input.outputFormat !== undefined ? { format: ctx.input.outputFormat } : {}),
      ...(ctx.input.outputDestination !== undefined
        ? { destination: ctx.input.outputDestination }
        : {})
    };
    let response = await new Client({ token: ctx.auth.token }).aiEditImage({
      input: ctx.input.imageUrl,
      options,
      output: Object.keys(output).length ? output : undefined
    });
    let data = response.data;
    return {
      output: {
        taskId: data.id,
        status: data.status,
        resultUrl: data.result_url,
        createdAt: data.created_at
      },
      message: `AI image edit submitted. Task ID: **${data.id}**, status: **${data.status}**.`
    };
  })
  .build();
