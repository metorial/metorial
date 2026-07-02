import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let createLipsync = SlateTool.create(spec, {
  name: 'Create Lip-Sync Video',
  key: 'create_lipsync',
  description: `Create a lip-synchronized video by combining a source video with an audio file. The video must contain a visible face and the audio must contain speech. Alternatively, use the audio from the source video itself. Video generation is asynchronous -- use the inference ID to check status. An optional webhook URL can receive completion notifications.`,
  constraints: [
    'Input video must be MP4, max 300 MB.',
    'Either provide an audio URL or set useAudioFromVideo to true.'
  ]
})
  .input(
    z.object({
      inputVideoUrl: z.string().describe('Public URL of the source video (MP4, max 300 MB)'),
      inputAudioUrl: z
        .string()
        .optional()
        .describe('Public URL of the audio file to lip-sync with'),
      useAudioFromVideo: z
        .boolean()
        .optional()
        .describe('Use the audio from the source video instead of a separate audio file'),
      title: z.string().optional().describe('Title for the lip-sync video'),
      description: z.string().optional().describe('Description for the lip-sync video'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive completion webhook notifications')
    })
  )
  .output(
    z.object({
      inferenceId: z.string().describe('Inference ID to track lip-sync generation status'),
      videoUrl: z
        .string()
        .nullable()
        .describe('URL to the output video (available when complete)'),
      thumbnailUrl: z.string().nullable().describe('Thumbnail image URL'),
      status: z.string().describe('Current generation status'),
      title: z.string().nullable().describe('Video title'),
      description: z.string().nullable().describe('Video description'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);
    let result = await client.createLipsync({
      inputVideoUrl: ctx.input.inputVideoUrl,
      inputAudioUrl: ctx.input.inputAudioUrl,
      useAudioFromVideo: ctx.input.useAudioFromVideo,
      title: ctx.input.title,
      description: ctx.input.description,
      webhookUrl: ctx.input.webhookUrl
    });

    return {
      output: {
        inferenceId: result.inference_id,
        videoUrl: result.video_url,
        thumbnailUrl: result.thumbnail_url,
        status: result.status,
        title: result.title,
        description: result.description,
        createdAt: result.created_at
      },
      message: `Lip-sync video generation started. Inference ID: **${result.inference_id}**, status: **${result.status}**.`
    };
  })
  .build();
