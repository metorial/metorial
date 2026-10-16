import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createVideo = SlateTool.create(spec, {
  name: 'Create Video',
  key: 'create_video',
  description: `Create a new video in your Spotlightr account by providing an external URL (YouTube, Vimeo, Google Drive, etc.). Optionally copy player settings from an existing video and assign the video to a project group.`,
  instructions: [
    'Provide a URL to link an external video. File uploads are not supported through this tool.',
    'The playerSettingsVideoId parameter accepts a base64-decoded video ID from which to copy player settings. Only videos owned by the authenticated account can be used.',
    'Set customS3 to 0 for Spotlightr storage or to your custom storage integration ID.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Title for the new video.'),
      url: z
        .string()
        .optional()
        .describe('External URL to link (YouTube, Vimeo, Google Drive, etc.).'),
      playerSettingsVideoId: z
        .string()
        .optional()
        .describe('Video ID from which to copy player settings.'),
      videoGroup: z.string().optional().describe('Project group ID to assign the video to.'),
      hlsEncryption: z
        .boolean()
        .optional()
        .describe('Whether to enable HLS encryption for the video.'),
      customS3: z
        .number()
        .optional()
        .describe('Custom storage integration ID, or 0 to use Spotlightr storage.')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('Response from Spotlightr after creating the video.')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.customS3 !== undefined &&
      (!Number.isSafeInteger(ctx.input.customS3) || ctx.input.customS3 < 0)
    ) {
      throw createApiServiceError(
        'Custom storage must be 0 or a positive whole-number integration ID.'
      );
    }
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createVideo({
      name: ctx.input.name,
      url: ctx.input.url,
      playerSettings: ctx.input.playerSettingsVideoId,
      videoGroup: ctx.input.videoGroup,
      hls: ctx.input.hlsEncryption,
      customS3: ctx.input.customS3
    });

    return {
      output: {
        result
      },
      message: `Created video **"${ctx.input.name}"** in Spotlightr.`
    };
  })
  .build();
