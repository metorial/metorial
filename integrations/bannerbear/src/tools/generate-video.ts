import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { spec } from '../spec';

export let generateVideo = SlateTool.create(spec, {
  name: 'Generate Video',
  key: 'generate_video',
  description: `Generate a video from a Bannerbear video template. Supports three build packs: **Overlay** (static graphic on video), **Transcribe** (auto-transcribed subtitles), and **Multi Overlay** (slideshow overlays). Includes trimming, zoom/pan, blur, and external media input.`,
  instructions: [
    'Provide a video template UID (not a regular template UID). Video templates are created from regular templates with a render type.',
    'For Transcribe videos, the transcription may need approval before final rendering if approval_required is set on the video template.'
  ],
  constraints: [
    'Video rendering is asynchronous and may take longer than image generation.',
    'Rate limited to 30 requests per 10 seconds.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      videoTemplateUid: z.string().describe('UID of the video template to generate from'),
      inputMediaUrl: z.string().optional().describe('URL of the input video or audio file'),
      modifications: z
        .array(
          z.object({
            name: z.string().describe('Layer name to modify'),
            text: z.string().optional().describe('Text content'),
            image_url: z.string().optional().describe('Image URL'),
            color: z.string().optional().describe('Color (hex)')
          })
        )
        .optional()
        .describe('List of modifications for Overlay/Multi Overlay build packs'),
      frames: z
        .array(
          z.array(
            z.object({
              name: z.string().describe('Layer name'),
              text: z.string().optional().describe('Text content'),
              image_url: z.string().optional().describe('Image URL')
            })
          )
        )
        .optional()
        .describe(
          'Frames for Multi Overlay build pack, each frame is a list of modifications'
        ),
      frameDurations: z
        .array(z.number())
        .optional()
        .describe('Duration in seconds for each frame in Multi Overlay'),
      trimToLengthInSeconds: z
        .number()
        .optional()
        .describe('Trim the output video to this length'),
      trimFrom: z.number().optional().describe('Start time offset in seconds for trimming'),
      zoom: z.boolean().optional().describe('Enable Ken Burns zoom/pan effect'),
      zoomFactor: z.number().optional().describe('Zoom factor for the zoom effect'),
      blur: z.boolean().optional().describe('Apply blur filter to the background video'),
      createGifPreview: z
        .boolean()
        .optional()
        .describe('Also generate a GIF preview of the video'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST when rendering completes'),
      metadata: z.string().optional().describe('Custom metadata to attach')
    })
  )
  .output(
    z.object({
      videoUid: z.string().describe('UID of the generated video'),
      status: z.string().describe('Rendering status'),
      videoUrl: z.string().nullable().describe('URL of the generated video file'),
      percentRendered: z.number().nullable().describe('Rendering progress percentage'),
      lengthInSeconds: z.number().nullable().describe('Total video length in seconds'),
      createdAt: z.string().describe('Timestamp when the video was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.createVideo({
      video_template: ctx.input.videoTemplateUid,
      input_media_url: ctx.input.inputMediaUrl,
      modifications: ctx.input.modifications,
      frames: ctx.input.frames,
      frame_durations: ctx.input.frameDurations,
      trim_to_length_in_seconds: ctx.input.trimToLengthInSeconds,
      trim_from: ctx.input.trimFrom,
      zoom: ctx.input.zoom,
      zoom_factor: ctx.input.zoomFactor,
      blur: ctx.input.blur,
      create_gif_preview: ctx.input.createGifPreview,
      webhook_url: ctx.input.webhookUrl,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        videoUid: result.uid,
        status: result.status,
        videoUrl: result.video_url || null,
        percentRendered: result.percent_rendered ?? null,
        lengthInSeconds: result.length_in_seconds ?? null,
        createdAt: result.created_at
      },
      message: `Video generation ${result.status === 'completed' ? 'completed' : 'initiated'} (UID: ${result.uid}). ${result.video_url ? `[View video](${result.video_url})` : 'Video is still rendering.'}`
    };
  })
  .build();
