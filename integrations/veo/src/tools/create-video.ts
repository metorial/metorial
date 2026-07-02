import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createVideo = SlateTool.create(spec, {
  name: 'Create Video',
  key: 'create_video',
  description: `Create a new video resource in VEO and obtain an upload URL. After creation, the returned upload URL can be used to upload the actual video file to Azure blob storage via a PUT request.`,
  instructions: [
    'After creating the video, use the returned uploadUrl to upload the actual file via a PUT request with the header x-ms-blob-type: BlockBlob.',
    'The video will be automatically transcoded after upload.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title for the video as displayed in VEO'),
      recordedStamp: z
        .string()
        .describe(
          'ISO 8601 timestamp of when the video was recorded (e.g. 2024-01-15T10:30:00Z)'
        ),
      mimeType: z
        .string()
        .optional()
        .default('video/mp4')
        .describe('MIME type of the video file to upload (e.g. video/mp4, video/quicktime)')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('ID of the newly created video resource'),
      uploadUrl: z
        .string()
        .optional()
        .describe('Azure blob storage URL for uploading the video file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let createResult = await client.createVideo(ctx.input.title, ctx.input.recordedStamp);
    let videoId = String(createResult.id ?? createResult.Id ?? createResult);

    let uploadUrl: string | undefined;
    try {
      let uploadToken = await client.getVideoUploadToken(videoId, ctx.input.mimeType);
      uploadUrl =
        typeof uploadToken === 'string' ? uploadToken : (uploadToken?.url ?? uploadToken?.Url);
    } catch (_e) {
      ctx.warn('Could not retrieve upload token. You may need to request it separately.');
    }

    return {
      output: {
        videoId,
        uploadUrl
      },
      message: `Created video **"${ctx.input.title}"** with ID \`${videoId}\`.${uploadUrl ? ' Upload URL is ready.' : ''}`
    };
  })
  .build();
