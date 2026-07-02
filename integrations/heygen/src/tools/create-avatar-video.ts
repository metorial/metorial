import { SlateTool } from 'slates';
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
      .string()
      .optional()
      .describe('Audio asset URL (required when type is "audio")'),
    speed: z.number().optional().describe('Speech speed multiplier (e.g. 1.0 for normal)'),
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
    url: z.string().optional().describe('Image or video URL (for "image" or "video" type)')
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
    'Set test to true to generate a free watermarked test video.'
  ],
  constraints: [
    '1 API credit = 1 minute of generated avatar video.',
    'Video generation is asynchronous; you must poll for status.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      scenes: z.array(sceneSchema).min(1).describe('Array of scenes to include in the video'),
      dimension: z
        .object({
          width: z.number().describe('Video width in pixels'),
          height: z.number().describe('Video height in pixels')
        })
        .optional()
        .describe('Custom video dimensions'),
      aspectRatio: z.string().optional().describe('Aspect ratio (e.g. "16:9", "9:16", "1:1")'),
      test: z
        .boolean()
        .optional()
        .describe('If true, generates a free watermarked test video'),
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
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.createVideo({
      videoInputs: ctx.input.scenes.map(scene => ({
        character: {
          type: scene.character.type,
          avatarId: scene.character.avatarId,
          avatarStyle: scene.character.avatarStyle,
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
