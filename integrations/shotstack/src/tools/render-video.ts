import { SlateTool } from 'slates';
import { z } from 'zod';
import { EditClient } from '../lib/client';
import { spec } from '../spec';

let mergeFieldSchema = z.object({
  find: z.string().describe('The placeholder string to find in the edit (e.g. "NAME")'),
  replace: z.string().describe('The value to replace the placeholder with')
});

let destinationSchema = z.object({
  provider: z
    .enum(['shotstack', 's3', 'mux', 'google-cloud-storage', 'google-drive', 'vimeo'])
    .describe('Destination provider'),
  exclude: z
    .boolean()
    .optional()
    .describe('Exclude this destination (only for shotstack provider)'),
  options: z
    .record(z.string(), z.any())
    .optional()
    .describe('Provider-specific options (e.g. bucket, region, prefix for S3)')
});

let outputSchema = z.object({
  format: z
    .enum(['mp4', 'gif', 'jpg', 'png', 'bmp', 'mp3'])
    .optional()
    .describe('Output format'),
  resolution: z
    .enum(['preview', 'mobile', 'sd', 'hd', '1080'])
    .optional()
    .describe('Output resolution preset'),
  aspectRatio: z
    .enum(['16:9', '9:16', '1:1', '4:5', '4:3'])
    .optional()
    .describe('Aspect ratio'),
  size: z
    .object({
      width: z.number().describe('Width in pixels (must be divisible by 2)'),
      height: z.number().describe('Height in pixels (must be divisible by 2)')
    })
    .optional()
    .describe('Custom output size (mutually exclusive with resolution/aspectRatio)'),
  fps: z.number().optional().describe('Frames per second (12, 15, 23.976, 24, 25, 29.97, 30)'),
  quality: z.enum(['low', 'medium', 'high']).optional().describe('Output quality'),
  scaleTo: z
    .enum(['preview', 'mobile', 'sd', 'hd', '1080'])
    .optional()
    .describe('Scale to resolution'),
  repeat: z.boolean().optional().describe('Loop GIF output'),
  mute: z.boolean().optional().describe('Mute audio in output'),
  range: z
    .object({
      start: z.number().optional().describe('Start time in seconds'),
      length: z.number().optional().describe('Duration in seconds')
    })
    .optional()
    .describe('Render a specific range of the timeline'),
  poster: z
    .object({
      capture: z.number().describe('Frame capture time in seconds')
    })
    .optional()
    .describe('Generate a poster image'),
  thumbnail: z
    .object({
      capture: z.number().describe('Frame capture time in seconds'),
      scale: z.number().optional().describe('Scale factor (0-1)')
    })
    .optional()
    .describe('Generate a thumbnail image'),
  destinations: z.array(destinationSchema).optional().describe('Output destinations')
});

let clipAssetSchema = z
  .record(z.string(), z.any())
  .describe('Asset object (video, image, title, text, audio, html, etc.) with a "type" field');

let transitionSchema = z.object({
  in: z
    .string()
    .optional()
    .describe('Transition in effect (e.g. fade, reveal, wipeLeft, slideLeft, zoom)'),
  out: z.string().optional().describe('Transition out effect')
});

let transformSchema = z.object({
  rotate: z.object({ angle: z.number() }).optional().describe('Rotation angle in degrees'),
  skew: z.object({ x: z.number(), y: z.number() }).optional().describe('Skew transformation'),
  flip: z
    .object({
      horizontal: z.boolean().optional(),
      vertical: z.boolean().optional()
    })
    .optional()
    .describe('Flip transformation')
});

let clipSchema = z.object({
  asset: clipAssetSchema,
  start: z.number().describe('Start time in seconds on the timeline'),
  length: z
    .union([z.number(), z.literal('auto')])
    .describe('Duration in seconds, or "auto" to match asset length'),
  fit: z
    .enum(['cover', 'contain', 'crop', 'none'])
    .optional()
    .describe('How the asset fits within the frame'),
  scale: z.number().optional().describe('Scale factor'),
  position: z
    .enum([
      'top',
      'topRight',
      'right',
      'bottomRight',
      'bottom',
      'bottomLeft',
      'left',
      'topLeft',
      'center'
    ])
    .optional()
    .describe('Position within the frame'),
  offset: z
    .object({ x: z.number(), y: z.number() })
    .optional()
    .describe('Offset from position (-1 to 1)'),
  transition: transitionSchema.optional().describe('Transition effects'),
  effect: z
    .string()
    .optional()
    .describe('Motion effect (zoomIn, zoomOut, slideLeft, slideRight, slideUp, slideDown)'),
  filter: z
    .string()
    .optional()
    .describe(
      'Visual filter (boost, contrast, darken, greyscale, lighten, muted, invert, negative)'
    ),
  opacity: z.number().optional().describe('Opacity (0-1)'),
  transform: transformSchema.optional().describe('Transform operations')
});

let trackSchema = z.object({
  clips: z.array(clipSchema).describe('Clips on this track')
});

let soundtrackSchema = z.object({
  src: z.string().describe('URL of the audio file'),
  effect: z.enum(['fadeIn', 'fadeOut', 'fadeInFadeOut']).optional().describe('Audio effect'),
  volume: z.number().optional().describe('Volume level (0-1)')
});

let timelineSchema = z.object({
  tracks: z
    .array(trackSchema)
    .describe('Array of tracks. Tracks are layered with the first track on top.'),
  soundtrack: soundtrackSchema.optional().describe('Background audio soundtrack'),
  background: z.string().optional().describe('Background color as hex (e.g. #000000)'),
  fonts: z
    .array(z.object({ src: z.string().describe('URL of font file') }))
    .optional()
    .describe('Custom fonts to load'),
  cache: z.boolean().optional().describe('Cache source assets for faster rendering')
});

export let renderVideoTool = SlateTool.create(spec, {
  name: 'Render Video',
  key: 'render_video',
  description: `Submit a video, image, or audio edit for rendering. Define a timeline with tracks, clips, transitions, effects, and filters. Supports output in MP4, GIF, JPG, PNG, BMP, and MP3 formats at various resolutions.
Use merge fields to substitute dynamic values into the edit. Configure output destinations including Shotstack CDN, AWS S3, Mux, Google Cloud Storage, Google Drive, and Vimeo.`,
  instructions: [
    'Tracks are layered with the first track on top (higher z-index).',
    'Clips on the same track must not overlap in time.',
    'Asset types include: video, image, title, text, audio, html, shape, svg, caption, richText.',
    'The "auto" length value will match the clip duration to the source asset duration.',
    'Use merge fields with {{ PLACEHOLDER }} in your text/URLs and provide replacements via the merge array.'
  ],
  constraints: [
    'Custom size dimensions must be divisible by 2. Max 1920px for video, 4096px for images.',
    'Resolution and aspectRatio are mutually exclusive with custom size.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      timeline: timelineSchema.describe('The timeline defining the edit composition'),
      output: outputSchema.describe('Output configuration'),
      merge: z
        .array(mergeFieldSchema)
        .optional()
        .describe('Merge field replacements for dynamic content'),
      callback: z
        .string()
        .optional()
        .describe('Webhook URL for render completion notifications')
    })
  )
  .output(
    z.object({
      renderId: z.string().describe('ID of the queued render job'),
      message: z.string().describe('Status message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);

    let body: Record<string, any> = {
      timeline: ctx.input.timeline,
      output: ctx.input.output
    };
    if (ctx.input.merge) body.merge = ctx.input.merge;
    if (ctx.input.callback) body.callback = ctx.input.callback;

    let result = await client.render(body);

    return {
      output: {
        renderId: result.response.id,
        message: result.response.message
      },
      message: `Render job queued with ID **${result.response.id}**. Use the "Get Render Status" tool to check progress.`
    };
  })
  .build();
