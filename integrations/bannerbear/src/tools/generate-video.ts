import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { integer, reject, stateMessage } from '../lib/contracts';
import { deliverGeneratedFiles, videoOutput } from '../lib/results';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let generateVideo = SlateTool.create(spec, {
  name: 'Generate Video',
  key: 'generate_video',
  description: `Generate a video from a Bannerbear video template. Supports three build packs: **Overlay** (static graphic on video), **Transcribe** (auto-transcribed subtitles), and **Multi Overlay** (slideshow overlays). Includes trimming, zoom/pan, blur, and external media input.`,
  instructions: [
    'Provide a video template UID (not a regular template UID). Video templates are created from regular templates with a render type.',
    'Use frames and frameDurations only with a Multi Overlay template. Overlay and Transcribe require inputMediaUrl.',
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
      projectId: projectIdSchema,
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
      trimFrom: z
        .number()
        .optional()
        .describe('Whole-second start offset, converted to the native HH:MM:SS field'),
      zoomPosition: z
        .enum(['center', 'top', 'right', 'bottom', 'left'])
        .optional()
        .describe(
          'Native panning position. Omit the legacy zoom toggle when using this field.'
        ),
      blurLevel: z
        .number()
        .optional()
        .describe(
          'Native blur intensity from 1 to 10. Omit the legacy blur toggle when using this field.'
        ),
      trimStartTime: z
        .string()
        .optional()
        .describe('Trim start in HH:MM:SS. Omit legacy trimFrom when using this field.'),
      trimEndTime: z
        .string()
        .optional()
        .describe('Trim end in HH:MM:SS. Cannot be combined with trimToLengthInSeconds.'),
      zoom: z
        .boolean()
        .optional()
        .describe(
          'Legacy toggle: true applies the documented center panning effect; false omits it'
        ),
      zoomFactor: z.number().optional().describe('Zoom factor for the zoom effect'),
      blur: z
        .boolean()
        .optional()
        .describe('Legacy toggle: true applies blur intensity 1; false omits it'),
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
    const client = new BannerbearClient({ ...ctx.auth, projectId: ctx.input.projectId });
    if (ctx.input.zoomPosition !== undefined && ctx.input.zoom !== undefined)
      reject('Use zoomPosition or the legacy zoom toggle, not both.');
    if (ctx.input.blurLevel !== undefined && ctx.input.blur !== undefined)
      reject('Use blurLevel or the legacy blur toggle, not both.');
    if (ctx.input.trimFrom !== undefined && ctx.input.trimStartTime !== undefined)
      reject('Use trimFrom or trimStartTime, not both.');
    const seconds =
      ctx.input.trimFrom === undefined ? undefined : integer(ctx.input.trimFrom, 0);
    const trimStart =
      seconds === undefined
        ? ctx.input.trimStartTime
        : `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const clock = (value: string | undefined): number | undefined => {
      if (value === undefined) return undefined;
      if (!/^\d{2,}:[0-5]\d:[0-5]\d$/.test(value)) reject('Use HH:MM:SS for trimming times.');
      const [hours = 0, minutes = 0, seconds = 0] = value.split(':').map(Number);
      const total = hours * 3600 + minutes * 60 + seconds;
      if (!Number.isSafeInteger(total)) reject('Provide a safe trimming time.');
      return total;
    };
    const start = clock(trimStart),
      end = clock(ctx.input.trimEndTime);
    if (end !== undefined && end <= (start ?? 0))
      reject('trimEndTime must be later than the start time.');
    if (ctx.input.trimToLengthInSeconds !== undefined && end !== undefined)
      reject('Use a duration or trimEndTime, not both.');
    const result = await client.createVideo({
      video_template: ctx.input.videoTemplateUid,
      input_media_url: ctx.input.inputMediaUrl,
      modifications: ctx.input.modifications,
      frames: ctx.input.frames,
      frame_durations: ctx.input.frameDurations,
      trim_to_length_in_seconds: ctx.input.trimToLengthInSeconds,
      trim_start_time: trimStart,
      trim_end_time: ctx.input.trimEndTime,
      zoom: ctx.input.zoomPosition ?? (ctx.input.zoom ? 'center' : undefined),
      zoom_factor: ctx.input.zoomFactor,
      blur: ctx.input.blurLevel ?? (ctx.input.blur ? 1 : undefined),
      create_gif_preview: ctx.input.createGifPreview,
      webhook_url: ctx.input.webhookUrl,
      metadata: ctx.input.metadata
    });
    const output = videoOutput(result);
    await deliverGeneratedFiles(ctx, 'video', result);
    return {
      output,
      message: `Video generation ${stateMessage(result.status)} (UID: ${output.videoUid}). Read its status with get_resource.`
    };
  })
  .build();
