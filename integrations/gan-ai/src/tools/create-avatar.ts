import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let createAvatar = SlateTool.create(spec, {
  name: 'Create Avatar',
  key: 'create_avatar',
  description: `Create a new AI avatar from a video recording. The video must be a publicly accessible MP4 file (max 300 MB) with at least 30 seconds of clear footage showing a single face. After creation, consent verification is required before the avatar can be used to generate videos. An optional webhook URL can be provided to receive status updates during processing.`,
  constraints: [
    'Base video must be an MP4 file, max 300 MB.',
    'Video must contain at least 30 seconds of clear footage with a single visible face.',
    'Avatar creation is asynchronous -- the avatar will be in "consent_pending" or "processing" status initially.'
  ]
})
  .input(
    z.object({
      baseVideoUrl: z
        .string()
        .describe('Public URL of the MP4 video to create the avatar from'),
      title: z.string().optional().describe('Display name for the avatar'),
      webhookUrl: z.string().optional().describe('URL to receive status webhook notifications')
    })
  )
  .output(
    z.object({
      avatarId: z.string().describe('Unique avatar identifier'),
      title: z.string().nullable().describe('Avatar display name'),
      thumbnail: z.string().nullable().describe('Thumbnail image URL'),
      status: z
        .string()
        .describe(
          'Current avatar status (consent_pending, processing, published, failed, etc.)'
        ),
      baseVideo: z.string().nullable().describe('URL to the base video'),
      createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);
    let result = await client.createAvatar({
      baseVideoUrl: ctx.input.baseVideoUrl,
      title: ctx.input.title,
      webhookUrl: ctx.input.webhookUrl
    });

    return {
      output: {
        avatarId: result.avatar_id,
        title: result.title,
        thumbnail: result.thumbnail,
        status: result.status,
        baseVideo: result.base_video,
        createdAt: result.created_at
      },
      message: `Avatar **${result.title || result.avatar_id}** created with status **${result.status}**.`
    };
  })
  .build();
