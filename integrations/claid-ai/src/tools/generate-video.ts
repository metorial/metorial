import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateVideo = SlateTool.create(spec, {
  name: 'Generate Video',
  key: 'generate_video',
  description: `Generate a dynamic video animation from a static image. Provide an image and describe the desired motion to produce ready-to-use animated content.

This is an async operation — a task ID is returned immediately for status polling.`,
  instructions: [
    'Provide a prompt describing the motion, or use auto-generation by setting autoPrompt to true.',
    'Use the Get Job Status tool to poll for completion.'
  ],
  constraints: [
    'Duration must be 5 or 10 seconds.',
    'Guidance scale range: 0–1 (default: 0.5).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrl: z.string().describe('Source image URL or storage URI'),
      prompt: z
        .string()
        .optional()
        .describe('Text prompt describing the desired motion/animation'),
      autoPrompt: z
        .boolean()
        .optional()
        .describe('If true, auto-generate a motion prompt from the image'),
      autoPromptGuidelines: z
        .string()
        .optional()
        .describe('Guidelines for auto-prompt generation'),
      negativePrompt: z.string().optional().describe('Elements to avoid in the video'),
      duration: z.enum(['5', '10']).optional().describe('Video duration in seconds (5 or 10)'),
      guidanceScale: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Prompt adherence strength (0–1, default: 0.5)'),
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

    let options: Record<string, unknown> = {};

    if (ctx.input.autoPrompt) {
      let promptConfig: Record<string, unknown> = { generate: true };
      if (ctx.input.autoPromptGuidelines)
        promptConfig.guidelines = ctx.input.autoPromptGuidelines;
      options.prompt = promptConfig;
    } else if (ctx.input.prompt) {
      options.prompt = ctx.input.prompt;
    }

    if (ctx.input.negativePrompt) options.negative_prompt = ctx.input.negativePrompt;
    if (ctx.input.duration) options.duration = Number.parseInt(ctx.input.duration, 10);
    if (ctx.input.guidanceScale !== undefined)
      options.guidance_scale = ctx.input.guidanceScale;

    ctx.info('Submitting video generation request');
    let result = await client.generateVideo({
      input: ctx.input.imageUrl,
      output: ctx.input.outputDestination,
      options
    });

    let data = result.data;

    return {
      output: {
        taskId: data.id,
        status: data.status,
        resultUrl: data.result_url,
        createdAt: data.created_at
      },
      message: `Video generation submitted. Task ID: **${data.id}**, status: **${data.status}**. Poll the result URL to check progress.`
    };
  })
  .build();
