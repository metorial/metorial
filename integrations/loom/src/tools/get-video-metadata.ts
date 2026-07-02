import { SlateTool } from 'slates';
import { z } from 'zod';
import { fetchOEmbed, isValidLoomUrl } from '../lib/client';
import { spec } from '../spec';

export let getVideoMetadata = SlateTool.create(spec, {
  name: 'Get Video Metadata',
  key: 'get_video_metadata',
  description: `Retrieve metadata for a Loom video using its share or embed URL. Returns the video title, thumbnail, dimensions, duration, and embed HTML via Loom's oEmbed endpoint. Useful for previewing video information, generating thumbnails, or building custom video galleries.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      videoUrl: z
        .string()
        .describe(
          'Loom video URL (share or embed format, e.g. https://www.loom.com/share/abc123)'
        ),
      maxWidth: z.number().optional().describe('Maximum width in pixels for the embed player'),
      maxHeight: z
        .number()
        .optional()
        .describe('Maximum height in pixels for the embed player')
    })
  )
  .output(
    z.object({
      title: z.string().describe('Title of the video'),
      videoType: z.string().describe('oEmbed type (typically "video")'),
      html: z.string().describe('HTML embed code for the video player'),
      width: z.number().nullable().describe('Width of the video player in pixels'),
      height: z.number().nullable().describe('Height of the video player in pixels'),
      thumbnailUrl: z.string().describe('URL of the video thumbnail image'),
      thumbnailWidth: z.number().describe('Width of the thumbnail in pixels'),
      thumbnailHeight: z.number().describe('Height of the thumbnail in pixels'),
      duration: z.number().describe('Duration of the video in seconds'),
      providerName: z.string().describe('Name of the video provider'),
      providerUrl: z.string().describe('URL of the video provider')
    })
  )
  .handleInvocation(async ctx => {
    if (!isValidLoomUrl(ctx.input.videoUrl)) {
      throw new Error(
        `Invalid Loom URL: "${ctx.input.videoUrl}". Expected format: https://www.loom.com/share/{videoId} or https://www.loom.com/embed/{videoId}`
      );
    }

    ctx.info(`Fetching metadata for Loom video: ${ctx.input.videoUrl}`);

    let metadata = await fetchOEmbed(ctx.input.videoUrl, {
      maxWidth: ctx.input.maxWidth,
      maxHeight: ctx.input.maxHeight
    });

    let durationFormatted = `${Math.floor(metadata.duration / 60)}m ${Math.round(metadata.duration % 60)}s`;

    return {
      output: {
        title: metadata.title,
        videoType: metadata.type,
        html: metadata.html,
        width: metadata.width,
        height: metadata.height,
        thumbnailUrl: metadata.thumbnailUrl,
        thumbnailWidth: metadata.thumbnailWidth,
        thumbnailHeight: metadata.thumbnailHeight,
        duration: metadata.duration,
        providerName: metadata.providerName,
        providerUrl: metadata.providerUrl
      },
      message: `Retrieved metadata for **"${metadata.title}"** (${durationFormatted} duration).`
    };
  })
  .build();
