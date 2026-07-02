import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlacidClient } from '../lib/client';
import { spec } from '../spec';

let transferSchema = z
  .object({
    to: z.literal('s3').describe('Storage provider (currently only "s3" is supported)'),
    key: z.string().describe('AWS access key'),
    secret: z.string().describe('AWS secret key'),
    region: z.string().describe('AWS region name'),
    bucket: z.string().describe('S3 bucket name'),
    visibility: z.enum(['public', 'private']).optional().describe('File visibility'),
    path: z.string().optional().describe('Full file path including filename and extension'),
    endpoint: z.string().optional().describe('Custom S3-compatible endpoint URL'),
    token: z.string().optional().describe('AWS STS session token')
  })
  .optional()
  .describe('Transfer generated video to S3-compatible storage');

let clipSchema = z.object({
  templateUuid: z.string().describe('UUID of the template used for this clip'),
  layers: z
    .record(z.string(), z.record(z.string(), z.unknown()))
    .optional()
    .describe('Layer data keyed by layer name'),
  audioUrl: z.string().optional().describe('URL to an MP3 audio file for this clip'),
  audioDuration: z.string().optional().describe('Audio duration (use "auto" for automatic)'),
  audioTrimStart: z.string().optional().describe('Audio trim start time (format: HH:MM:SS)'),
  audioTrimEnd: z.string().optional().describe('Audio trim end time (format: HH:MM:SS)')
});

export let generateVideo = SlateTool.create(spec, {
  name: 'Generate Video',
  key: 'generate_video',
  description: `Generate a video from one or more Placid templates used as clips. Each clip is a template populated with dynamic layer data including text, images, and video files. Clips are merged sequentially. Supports audio tracks, frame rate control, and resolution settings. The generated video can be transferred to S3-compatible storage.`,
  instructions: [
    'Provide one or more clips, each referencing a template UUID and optional layer data.',
    'Picture layers can accept video URLs via the "video" property for animated content.',
    'If multiple videos are used in a single clip, shorter ones loop automatically.'
  ],
  constraints: [
    'Maximum video length is 3 minutes (180 seconds).',
    'Every 10 seconds of video costs 10 credits.',
    'Frame rate range: 1-30 fps (default: 25).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      clips: z
        .array(clipSchema)
        .min(1)
        .describe(
          'Array of clips to include in the video, each with a template UUID and optional layer/audio data'
        ),
      width: z.number().optional().describe('Output width in pixels'),
      height: z.number().optional().describe('Output height in pixels'),
      fps: z.number().optional().describe('Frame rate (1-30, default: 25)'),
      filename: z.string().optional().describe('Output filename'),
      canvasBackground: z
        .string()
        .optional()
        .describe('Canvas background color hex or "blur" for blurred background'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST notification when generation completes'),
      passthrough: z
        .string()
        .optional()
        .describe('Custom reference data returned in the webhook payload (max 1024 chars)'),
      transfer: transferSchema
    })
  )
  .output(
    z.object({
      videoId: z.number().describe('Unique ID of the generated video'),
      status: z.string().describe('Generation status: queued, finished, or error'),
      videoUrl: z
        .string()
        .nullable()
        .describe('URL of the generated video (null if still queued)'),
      pollingUrl: z.string().describe('URL to poll for status updates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlacidClient({ token: ctx.auth.token });

    let modifications: Record<string, unknown> = {};
    if (ctx.input.width !== undefined) modifications.width = ctx.input.width;
    if (ctx.input.height !== undefined) modifications.height = ctx.input.height;
    if (ctx.input.fps !== undefined) modifications.fps = ctx.input.fps;
    if (ctx.input.filename) modifications.filename = ctx.input.filename;
    if (ctx.input.canvasBackground)
      modifications.canvas_background = ctx.input.canvasBackground;
    modifications.format = 'mp4';

    let result = await client.createVideo({
      clips: ctx.input.clips.map(clip => ({
        templateUuid: clip.templateUuid,
        layers: clip.layers,
        audio: clip.audioUrl,
        audioDuration: clip.audioDuration,
        audioTrimStart: clip.audioTrimStart,
        audioTrimEnd: clip.audioTrimEnd
      })),
      modifications: Object.keys(modifications).length > 0 ? modifications : undefined,
      transfer: ctx.input.transfer,
      webhookSuccess: ctx.input.webhookUrl,
      passthrough: ctx.input.passthrough
    });

    return {
      output: {
        videoId: result.id,
        status: result.status,
        videoUrl: result.video_url,
        pollingUrl: result.polling_url
      },
      message:
        result.status === 'finished'
          ? `Video **#${result.id}** generated with **${ctx.input.clips.length}** clip(s). [View video](${result.video_url})`
          : `Video **#${result.id}** with **${ctx.input.clips.length}** clip(s) is **${result.status}**. Poll \`${result.polling_url}\` for updates.`
    };
  })
  .build();
