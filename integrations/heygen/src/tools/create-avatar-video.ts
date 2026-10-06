import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

let characterSchema = z
  .object({
    type: z
      .enum(['avatar', 'talking_photo'])
      .describe('Type of character: "avatar" for AI avatar, "talking_photo" for photo avatar'),
    avatarId: z.string().describe('Avatar or talking photo ID'),
    avatarStyle: z
      .enum(['normal', 'circle', 'closeUp'])
      .optional()
      .describe('Avatar display style'),
    engine: z
      .enum(['avatar_iii', 'avatar_iv', 'avatar_v'])
      .optional()
      .describe(
        'Rendering engine supported by this avatar; discover supportedApiEngines with list_avatars. Uses Avatar IV when omitted.'
      ),
    scale: z.number().optional().describe('Scale factor for the avatar (0 to 1)'),
    offset: z
      .object({
        x: z.number().describe('Horizontal offset'),
        y: z.number().describe('Vertical offset')
      })
      .optional()
      .describe('Position offset for the avatar')
  })
  .describe('Character configuration for the scene');

let voiceSchema = z
  .object({
    type: z.enum(['text', 'audio']).describe('"text" for TTS or "audio" for audio file input'),
    voiceId: z.string().optional().describe('Voice ID for TTS (required when type is "text")'),
    inputText: z
      .string()
      .optional()
      .describe('Script text for the avatar to speak (required when type is "text")'),
    inputAudio: z
      .url({ protocol: /^https?$/ })
      .optional()
      .describe('Audio asset URL (required when type is "audio")'),
    speed: z
      .number()
      .optional()
      .describe('TTS speed multiplier from 0.5 to 1.5; applies to text scenes'),
    emotion: z.string().optional().describe('Voice emotion if supported by the voice')
  })
  .describe('Voice configuration for the scene');

let backgroundSchema = z
  .object({
    type: z.enum(['color', 'image', 'video', 'transparent']).describe('Background type'),
    value: z
      .string()
      .optional()
      .describe('Color hex value (for "color" type, e.g. "#ffffff")'),
    url: z
      .url({ protocol: /^https?$/ })
      .optional()
      .describe('Image or video URL (for "image" or "video" type)')
  })
  .optional()
  .describe('Background configuration for the scene');

let sceneSchema = z
  .object({
    character: characterSchema,
    voice: voiceSchema,
    background: backgroundSchema
  })
  .describe('A single scene in the video');

export let createAvatarVideo = SlateTool.create(spec, {
  name: 'Create Avatar Video',
  key: 'create_avatar_video',
  description: `Generate an AI avatar video with one or more scenes. Each scene has an avatar character, voice/script, and optional background.
Supports multi-scene videos with different avatars, voices, and backgrounds per scene. Video generation is asynchronous — use **Get Video Status** to check when it's ready.`,
  instructions: [
    'Use "list_avatars" to find available avatar IDs before creating a video.',
    'Use "list_voices" to find available voice IDs before creating a video.',
    'Legacy test mode requests a watermarked test video; it does not apply to the current v3 API.'
  ],
  constraints: [
    'Legacy layout, dimension, and test options use v2 compatibility, which HeyGen plans to retire after October 31, 2026.',
    'Video generation is asynchronous; you must poll for status.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      scenes: z
        .array(sceneSchema)
        .min(1)
        .max(50)
        .describe('Array of scenes to include in the video'),
      dimension: z
        .object({
          width: z.number().int().positive().describe('Video width in pixels'),
          height: z.number().int().positive().describe('Video height in pixels')
        })
        .optional()
        .describe('Custom video dimensions'),
      aspectRatio: z.string().optional().describe('Aspect ratio (e.g. "16:9", "9:16", "1:1")'),
      resolution: z
        .enum(['720p', '1080p', '4k'])
        .optional()
        .describe('v3 output resolution; do not combine with legacy layout or test options'),
      test: z
        .boolean()
        .optional()
        .describe('If true, requests a watermarked video through legacy test mode'),
      title: z.string().optional().describe('Title for the video'),
      callbackId: z
        .string()
        .optional()
        .describe('Custom callback ID for webhook notifications')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('Generated video ID for status polling')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.aspectRatio &&
      !['16:9', '9:16', '4:5', '5:4', '1:1', 'auto'].includes(ctx.input.aspectRatio)
    )
      throw createApiServiceError(
        'Use a supported aspect ratio: 16:9, 9:16, 4:5, 5:4, 1:1, or auto.'
      );
    for (const scene of ctx.input.scenes) {
      if (
        scene.voice.type === 'text' &&
        (!scene.voice.inputText?.trim() || !scene.voice.voiceId || scene.voice.inputAudio)
      )
        throw createApiServiceError(
          'Text scenes require voiceId and inputText, and cannot include inputAudio.'
        );
      if (
        scene.voice.type === 'audio' &&
        (!scene.voice.inputAudio || scene.voice.inputText || scene.voice.voiceId)
      )
        throw createApiServiceError(
          'Audio scenes require inputAudio and cannot include inputText or voiceId.'
        );
      if (
        scene.voice.type === 'text' &&
        scene.voice.speed !== undefined &&
        (scene.voice.speed < 0.5 || scene.voice.speed > 1.5)
      )
        throw createApiServiceError(
          'Avatar text-to-speech speed must be between 0.5 and 1.5.'
        );
      if (
        scene.voice.type === 'audio' &&
        (scene.voice.speed !== undefined || scene.voice.emotion)
      )
        throw createApiServiceError(
          'Audio scenes use the supplied recording. Remove speed and emotion, or use a text scene.'
        );
      if (
        scene.background?.type === 'color' &&
        !/^#[0-9a-fA-F]{6}$/.test(scene.background.value ?? '')
      )
        throw createApiServiceError(
          'Color backgrounds require a six-digit hex value such as #ffffff.'
        );
      if (
        (scene.background?.type === 'image' || scene.background?.type === 'video') &&
        !scene.background.url
      )
        throw createApiServiceError('Image and video backgrounds require a public URL.');
    }
    let client = new HeyGenClient(ctx.auth);

    let result = await client.createVideo({
      videoInputs: ctx.input.scenes.map(scene => ({
        character: {
          type: scene.character.type,
          avatarId: scene.character.avatarId,
          avatarStyle: scene.character.avatarStyle,
          engine: scene.character.engine,
          scale: scene.character.scale,
          offset: scene.character.offset
        },
        voice: {
          type: scene.voice.type,
          voiceId: scene.voice.voiceId,
          inputText: scene.voice.inputText,
          inputAudio: scene.voice.inputAudio,
          speed: scene.voice.speed,
          emotion: scene.voice.emotion
        },
        background: scene.background
          ? {
              type: scene.background.type,
              value: scene.background.value,
              url: scene.background.url
            }
          : undefined
      })),
      dimension: ctx.input.dimension,
      resolution: ctx.input.resolution,
      aspectRatio: ctx.input.aspectRatio,
      test: ctx.input.test,
      title: ctx.input.title,
      callbackId: ctx.input.callbackId
    });

    return {
      output: result,
      message: `Avatar video generation started with ${ctx.input.scenes.length} scene(s). Video ID: **${result.videoId}**. Use "Get Video Status" to check progress.`
    };
  })
  .build();
