import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let generatePhotoAvatarVideo = SlateTool.create(spec, {
  name: 'Generate Photo Avatar Video',
  key: 'generate_photo_avatar_video',
  description: `Generate a video from a published photo avatar. Provide either an audio URL alone, or both a text script and voice sample URL together. The photo avatar will be animated to speak the provided audio or text. Video generation is asynchronous.`,
  constraints: [
    'Provide either audioUrl alone, or both text and voiceSampleUrl together.',
    'Photo avatar must be in "published" status.'
  ]
})
  .input(
    z.object({
      photoAvatarId: z.string().describe('ID of the published photo avatar'),
      title: z.string().optional().describe('Title for the generated video'),
      text: z
        .string()
        .optional()
        .describe('Script text for the avatar to speak (use with voiceSampleUrl)'),
      audioUrl: z
        .string()
        .optional()
        .describe('Public URL of audio file (use alone, without text/voiceSampleUrl)'),
      voiceSampleUrl: z
        .string()
        .optional()
        .describe('Public URL of a voice sample for TTS (use with text)')
    })
  )
  .output(
    z.object({
      photoAvatarId: z.string().describe('Photo avatar ID used'),
      photoAvatarInferenceId: z
        .string()
        .describe('Inference ID to track video generation status'),
      title: z.string().nullable().describe('Video title'),
      status: z.string().describe('Current generation status'),
      videoUrl: z
        .string()
        .nullable()
        .describe('URL to the generated video (available when complete)'),
      downloadableVideoLink: z.string().nullable().describe('Downloadable video link'),
      inputText: z.string().nullable().describe('Script text used'),
      createdAt: z.string().nullable().describe('ISO 8601 creation timestamp'),
      creditDetails: z
        .object({
          ttsCost: z.number(),
          ganCost: z.number()
        })
        .nullable()
        .describe('Credit costs for this generation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);
    let result = await client.createPhotoAvatarInference({
      photoAvatarId: ctx.input.photoAvatarId,
      title: ctx.input.title,
      text: ctx.input.text,
      audioUrl: ctx.input.audioUrl,
      voiceSampleUrl: ctx.input.voiceSampleUrl
    });

    return {
      output: {
        photoAvatarId: result.photo_avatar_id,
        photoAvatarInferenceId: result.photo_avatar_inference_id,
        title: result.title,
        status: result.status,
        videoUrl: result.video,
        downloadableVideoLink: result.downloadable_video_link,
        inputText: result.input_text,
        createdAt: result.created_at,
        creditDetails: result.credit_details
          ? {
              ttsCost: result.credit_details.tts_cost,
              ganCost: result.credit_details.gan_cost
            }
          : null
      },
      message: `Photo avatar video generation started. Inference ID: **${result.photo_avatar_inference_id}**, status: **${result.status}**.`
    };
  })
  .build();
