import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { assertGenerationSucceeded, Client } from '../lib/client';
import { spec } from '../spec';

export let generateVideo = SlateTool.create(spec, {
  name: 'Generate Video',
  key: 'generate_video',
  description: `Generate videos from text prompts or reference images using MiniMax video models.
Video generation is asynchronous — the tool submits the request and polls for results.
Supports text-to-video and image-to-video workflows.`,
  instructions: [
    'Use model IDs like "video-01" for MiniMax video generation.',
    'Optionally provide a firstFrameImage URL to use as the starting frame for image-to-video generation.',
    'If the video is still processing, call get_video_result with its generationId.'
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

    let generationId = createResult.generation_id ?? createResult.id;
    if (!generationId) {
      throw createApiServiceError('AI/ML API returned no video generation ID. Try again.');
    }
    let maxAttempts = 30;
    let pollIntervalMs = 10000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let result = await client.getVideoResult(generationId);
      assertGenerationSucceeded(result, 'Video');

      if (result.status === 'completed') {
        if (!result.video?.url) {
          throw createApiServiceError(
            'AI/ML API reported a completed video without a download URL. Try get_video_result.'
          );
        }
        if (result.video?.url) {
          await ctx.addAttachment({
            type: 'url',
            url: result.video.url,
            mimeType: 'video/mp4'
          });
        }
        return {
          output: {
            generationId,
            status: 'completed',
            videoUrl: result.video?.url
          },
          message: `Video generated successfully using **${ctx.input.model}**. ${result.video?.url ? `[View video](${result.video.url})` : ''}`
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
      message: `Video is still processing. Call get_video_result with generation ID: \`${generationId}\`.`
    };
  })
  .build();
