import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

export let generateVideo = SlateTool.create(spec, {
  name: 'Generate Video',
  key: 'generate_video',
  description: `Generate videos from text prompts, images, or other videos using Fal.ai models such as Kling, LTX, Veo, Sora, and more.
Supports text-to-video, image-to-video, and video-to-video transformations.
Runs synchronously and returns the generated video URL.`,
  instructions: [
    'Use the modelId parameter to select the video model, e.g. "fal-ai/kling-video/v1/standard/text-to-video" or "fal-ai/ltx-video".',
    'For image-to-video, provide an imageUrl. For video-to-video, provide a videoUrl.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe(
          'Model endpoint ID, e.g. "fal-ai/kling-video/v1/standard/text-to-video", "fal-ai/ltx-video"'
        ),
      prompt: z.string().describe('Text prompt describing the desired video'),
      negativePrompt: z
        .string()
        .optional()
        .describe('Text describing what to avoid in the generated video'),
      imageUrl: z
        .string()
        .optional()
        .describe('Input image URL for image-to-video generation'),
      videoUrl: z
        .string()
        .optional()
        .describe('Input video URL for video-to-video transformation'),
      aspectRatio: z
        .string()
        .optional()
        .describe('Aspect ratio for the output video, e.g. "16:9", "9:16", "1:1"'),
      duration: z.number().optional().describe('Desired duration in seconds'),
      seed: z.number().optional().describe('Random seed for reproducible generation'),
      additionalParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional model-specific parameters')
    })
  )
  .output(
    z.object({
      videoUrl: z.string().describe('URL of the generated video on fal CDN'),
      contentType: z.string().optional().describe('MIME type of the generated video'),
      seed: z.number().optional().describe('Seed used for generation'),
      timings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Timing information for the generation process')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FalClient(ctx.auth.token);

    let input: Record<string, any> = {
      prompt: ctx.input.prompt,
      ...(ctx.input.additionalParams || {})
    };

    if (ctx.input.negativePrompt) input.negative_prompt = ctx.input.negativePrompt;
    if (ctx.input.imageUrl) input.image_url = ctx.input.imageUrl;
    if (ctx.input.videoUrl) input.video_url = ctx.input.videoUrl;
    if (ctx.input.aspectRatio) input.aspect_ratio = ctx.input.aspectRatio;
    if (ctx.input.duration !== undefined) input.duration = ctx.input.duration;
    if (ctx.input.seed !== undefined) input.seed = ctx.input.seed;

    ctx.progress('Generating video...');
    let result = await client.runModel(ctx.input.modelId, input);

    let videoUrl = result.video?.url || result.video_url || result.videos?.[0]?.url || '';
    let contentType = result.video?.content_type || result.content_type;

    return {
      output: {
        videoUrl,
        contentType,
        seed: result.seed,
        timings: result.timings
      },
      message: `Generated video using **${ctx.input.modelId}**.\n- ${videoUrl}`
    };
  })
  .build();
