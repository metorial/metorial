import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let generateAvatarVideo = SlateTool.create(spec, {
  name: 'Generate Avatar Video',
  key: 'generate_avatar_video',
  description: `Generate an HD video from a published AI avatar. Provide a text script (up to 2,000 characters) or an audio URL for the avatar to speak. If both are provided, the audio URL takes priority. The avatar must be in "published" status. Video generation is asynchronous -- use the inference ID to check status later.`,
  constraints: [
    'Avatar must be in "published" status.',
    'Text script supports up to 2,000 characters.',
    'Costs 10,000 credits per minute of video.',
    'If both text and audioUrl are provided, audioUrl takes priority.'
  ]
})
  .input(
    z.object({
      avatarId: z.string().describe('ID of the published avatar to generate video from'),
      title: z.string().optional().describe('Title for the generated video'),
      text: z
        .string()
        .optional()
        .describe('Script text for the avatar to speak (up to 2,000 characters)'),
      audioUrl: z
        .string()
        .optional()
        .describe('Public URL of audio file for the avatar (overrides text)')
    })
  )
  .output(
    z.object({
      avatarId: z.string().describe('Avatar ID used'),
      inferenceId: z.string().describe('Inference ID to track video generation status'),
      title: z.string().nullable().describe('Video title'),
      status: z.string().describe('Current generation status'),
      videoUrl: z
        .string()
        .nullable()
        .describe('URL to the generated video (available when complete)'),
      thumbnail: z.string().nullable().describe('Thumbnail URL'),
      createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);
    let result = await client.createAvatarVideo({
      avatarId: ctx.input.avatarId,
      title: ctx.input.title,
      text: ctx.input.text,
      audioUrl: ctx.input.audioUrl
    });

    return {
      output: {
        avatarId: result.avatar_id,
        inferenceId: result.inference_id,
        title: result.title,
        status: result.status,
        videoUrl: result.video,
        thumbnail: result.thumbnail,
        createdAt: result.created_at
      },
      message: `Avatar video generation started. Inference ID: **${result.inference_id}**, status: **${result.status}**.`
    };
  })
  .build();
