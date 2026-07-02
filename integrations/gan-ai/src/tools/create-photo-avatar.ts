import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let createPhotoAvatar = SlateTool.create(spec, {
  name: 'Create Photo Avatar',
  key: 'create_photo_avatar',
  description: `Create an AI avatar from a still photo image. The image must be a publicly accessible URL containing a clear face. Once published, the photo avatar can be used to generate videos with lip-synced speech. An optional webhook URL can receive status updates.`
})
  .input(
    z.object({
      baseImageUrl: z
        .string()
        .describe('Public URL of the face image to create the avatar from'),
      title: z.string().optional().describe('Display name for the photo avatar'),
      webhookUrl: z.string().optional().describe('URL to receive status webhook notifications')
    })
  )
  .output(
    z.object({
      photoAvatarId: z.string().describe('Unique photo avatar identifier'),
      title: z.string().nullable().describe('Photo avatar display name'),
      baseImage: z.string().nullable().describe('URL to the base image'),
      status: z
        .string()
        .describe('Current status (draft, processing, published, failed, deleted)'),
      createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);
    let result = await client.createPhotoAvatar({
      baseImageUrl: ctx.input.baseImageUrl,
      title: ctx.input.title,
      webhookUrl: ctx.input.webhookUrl
    });

    return {
      output: {
        photoAvatarId: result.photo_avatar_id,
        title: result.title,
        baseImage: result.base_image,
        status: result.status,
        createdAt: result.created_at
      },
      message: `Photo avatar **${result.title || result.photo_avatar_id}** created with status **${result.status}**.`
    };
  })
  .build();
