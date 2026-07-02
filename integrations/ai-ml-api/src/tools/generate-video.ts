import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateVideo = SlateTool.create(spec, {
  name: 'Generate Video',
  key: 'generate_video',
  description: `Generate videos from text prompts or reference images using video generation models like MiniMax and Kling AI.
Video generation is asynchronous — the tool submits the request and polls for results.
Supports text-to-video and image-to-video workflows.`,
  instructions: [
    'Use model IDs like "video-01" for MiniMax video generation.',
    'Optionally provide a firstFrameImage URL to use as the starting frame for image-to-video generation.'
  ],
  constraints: [
    'Video generation typically takes less than a minute but may take longer for complex prompts.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z.string().describe('Video model ID, e.g. "video-01"'),
      prompt: z.string().describe('Text description of the desired video content'),
      firstFrameImage: z
        .string()
        .optional()
        .describe('URL of an image to use as the initial frame for image-to-video generation')
    })
  )
  .output(
    z.object({
      generationId: z.string().describe('Generation ID for the video task'),
      status: z
        .string()
        .describe('Status of the video generation (e.g. "completed", "processing")'),
      videoUrl: z.string().optional().describe('URL of the generated video, if completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let createResult = await client.generateVideo({
      model: ctx.input.model,
      prompt: ctx.input.prompt,
      firstFrameImage: ctx.input.firstFrameImage
    });

    let generationId = createResult.generation_id;
    let maxAttempts = 30;
    let pollIntervalMs = 10000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let result = await client.getVideoResult(generationId);

      if (result.status === 'completed') {
        return {
          output: {
            generationId,
            status: 'completed',
            videoUrl: result.video?.url
          },
          message: `Video generated successfully using **${ctx.input.model}**. ${result.video?.url ? `[View video](${result.video.url})` : ''}`
        };
      }

      if (result.status === 'failed' || result.status === 'error') {
        return {
          output: {
            generationId,
            status: result.status,
            videoUrl: undefined
          },
          message: `Video generation failed with status: ${result.status}.`
        };
      }

      ctx.progress(`Video generation in progress (attempt ${attempt + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    return {
      output: {
        generationId,
        status: 'processing',
        videoUrl: undefined
      },
      message: `Video is still processing. Generation ID: \`${generationId}\`.`
    };
  })
  .build();
