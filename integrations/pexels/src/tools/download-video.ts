import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { videoFileSchema, videoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let downloadVideo = SlateTool.create(spec, {
  name: 'Download Video',
  key: 'download_video',
  description:
    'Download a specific file version of a Pexels video. Call get_video or search_videos to choose a fileId from videoFiles. HLS streaming playlists cannot be downloaded as a standalone video.',
  instructions: ['Credit Pexels and the videographer when using the video.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      videoId: z.number().describe('Pexels video ID from get_video or search_videos'),
      fileId: z
        .number()
        .describe("File ID from that video's videoFiles. Choose a non-HLS file.")
    })
  )
  .output(z.object({ video: videoSchema, file: videoFileSchema }))
  .handleInvocation(async ctx => {
    if (!Number.isSafeInteger(ctx.input.fileId) || ctx.input.fileId < 1) {
      throw createApiServiceError('fileId must be a positive whole-number Pexels file ID.');
    }
    let video = await new Client(ctx.auth).getVideo(ctx.input.videoId);
    let file = video.videoFiles.find(version => version.fileId === ctx.input.fileId);
    if (!file) {
      throw createApiServiceError(
        'The fileId does not belong to this video. Call get_video to choose an available file.'
      );
    }
    if (file.quality === 'hls' || /\.m3u8(?:\?|$)/i.test(file.link)) {
      throw createApiServiceError(
        'Choose a non-HLS file from get_video to download a standalone video.'
      );
    }
    await ctx.addAttachment({ type: 'url', url: file.link, mimeType: file.fileType });
    return {
      output: { video, file },
      message: `Prepared file **#${file.fileId}** of video **#${video.videoId}** for download.`
    };
  })
  .build();
