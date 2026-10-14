import {
  createApiServiceError,
  getResponseHeaderValue,
  isApiErrorRecord,
  SlateTool
} from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVideoDownload = SlateTool.create(spec, {
  name: 'Get Video Download',
  key: 'get_video_download',
  description: `Download a transcoded VEO video in its available resolutions and retrieve the original download token details. The video must have finished transcoding.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('ID of the video to get download links for')
    })
  )
  .output(
    z.object({
      duration: z.number().optional().describe('Video duration in seconds'),
      tokens: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of download token objects with URLs and resolution info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let result = await client.getVideoDownloadToken(ctx.input.videoId);

    let tokens = result.Tokens ?? result.tokens ?? result.Token ?? result.token ?? [];
    let tokenList = Array.isArray(tokens) ? tokens : [tokens];

    for (let token of tokenList) {
      if (!isApiErrorRecord(token)) {
        throw createApiServiceError('VEO returned invalid video download details.');
      }
      let url = token.Url ?? token.url;
      if (typeof url !== 'string' || !url) {
        throw createApiServiceError(
          'VEO did not return a download URL for a video rendition.'
        );
      }
      let download = await client.downloadVideo(url);
      await ctx.addAttachment({
        type: 'content',
        content: download.data,
        mimeType: getResponseHeaderValue(download.headers, 'content-type') ?? 'video/mp4'
      });
    }

    // The provider describes these links as one-time use. Return a new,
    // unused token set after downloading so existing URL consumers still work.
    let outputResult = tokenList.length
      ? await client.getVideoDownloadToken(ctx.input.videoId)
      : result;
    let duration = outputResult.Duration ?? outputResult.duration;
    let outputTokens =
      outputResult.Tokens ??
      outputResult.tokens ??
      outputResult.Token ??
      outputResult.token ??
      [];

    return {
      output: {
        duration,
        tokens: Array.isArray(outputTokens) ? outputTokens : [outputTokens]
      },
      message: `Prepared video \`${ctx.input.videoId}\` for download${duration ? ` (duration: ${duration}s)` : ''}.`
    };
  })
  .build();
